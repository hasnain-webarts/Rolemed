import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Admission from '@/models/Admission';
import Patient from '@/models/Patient';
import Equipment from '@/models/Equipment';
import AuditLog from '@/models/AuditLog';
import { dispatchNotification } from '@/lib/notificationService';

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;

    const admission = await Admission.findOne({
      $or: [
        { admissionId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!admission) {
      return NextResponse.json(
        { success: false, error: 'Admission record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admission,
    });
  } catch (error) {
    console.error('[API Admission [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching admission details' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const admission = await Admission.findOne({
      $or: [
        { admissionId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!admission) {
      return NextResponse.json(
        { success: false, error: 'Admission record not found' },
        { status: 404 }
      );
    }

    // If discharging patient
    if (body.status === 'Discharged') {
      const topologyType = mongoose.connection?.client?.topology?.description?.type;
      const supportsTransactions = ['ReplicaSetWithPrimary', 'Sharded'].includes(topologyType);

      if (supportsTransactions) {
        let session = null;
        try {
          session = await mongoose.startSession();
          session.startTransaction();
          admission.status = 'Discharged';
          admission.dischargeDate = new Date();
          if (body.notes) admission.notes = body.notes;
          if (body.dischargeSummary) admission.dischargeSummary = body.dischargeSummary;
          await admission.save({ session });

          // Release bed on patient record within same transaction
          await Patient.findOneAndUpdate(
            { patientId: admission.patientId },
            {
              $set: {
                status: 'Outpatient',
                assignedBed: '',
              },
            },
            { session }
          );
          await session.commitTransaction();
        } catch (txError) {
          if (session) {
            await session.abortTransaction().catch(() => {});
          }
          console.warn('[Admissions Discharge] Replica transaction failed, falling back to direct write:', txError.message);
          admission.status = 'Discharged';
          admission.dischargeDate = new Date();
          if (body.notes) admission.notes = body.notes;
          if (body.dischargeSummary) admission.dischargeSummary = body.dischargeSummary;
          await admission.save();
          await Patient.findOneAndUpdate(
            { patientId: admission.patientId },
            {
              $set: {
                status: 'Outpatient',
                assignedBed: '',
              },
            }
          );
        } finally {
          if (session) {
            session.endSession();
          }
        }
      } else {
        // Direct write for standalone MongoDB deployments (RM-DATA-001)
        admission.status = 'Discharged';
        admission.dischargeDate = new Date();
        if (body.notes) admission.notes = body.notes;
        if (body.dischargeSummary) admission.dischargeSummary = body.dischargeSummary;
        await admission.save();

        await Patient.findOneAndUpdate(
          { patientId: admission.patientId },
          {
            $set: {
              status: 'Outpatient',
              assignedBed: '',
            },
          }
        );
      }

      // Synchronize Bed Asset Fleet status in Equipment collection
      try {
        await Equipment.findOneAndUpdate(
          { category: 'Hospital Bed', bedNumber: admission.bedNumber },
          {
            $set: {
              status: 'Operational',
              notes: `Discharged ${admission.patientName} on ${new Date().toISOString().split('T')[0]}. Bed sanitized and vacant for intake.`,
            },
          }
        );
      } catch (eqErr) {
        console.warn('[Admissions Discharge] Warning updating equipment bed status:', eqErr.message);
      }

      // Dispatch Discharge Summary Notification
      Patient.findOne({ patientId: admission.patientId }).select('email phone').lean().then((pat) => {
        dispatchNotification({
          recipientId: admission.patientId,
          recipientRole: 'patient',
          recipientName: admission.patientName,
          recipientEmail: pat?.email || '',
          recipientPhone: pat?.phone || '',
          type: 'INPATIENT_DISCHARGE',
          data: {
            admissionId: admission.admissionId,
            patientId: admission.patientId,
            patientName: admission.patientName,
            ward: admission.ward,
            bedNumber: admission.bedNumber,
          },
          channels: ['email', 'whatsapp', 'in_app'],
          metadata: { admissionId: admission.admissionId, ward: admission.ward, bedNumber: admission.bedNumber },
        }).catch((err) => console.warn('[Discharge Notification Warning]:', err.message));
      }).catch((err) => console.warn('[Discharge Patient Lookup Warning]:', err.message));

      return NextResponse.json({
        success: true,
        message: `Patient ${admission.patientName} discharged from ${admission.ward}, Bed ${admission.bedNumber}`,
        admission,
      });
    }

    // Inpatient Bed / Ward Transfer Validation & Collision Check
    const targetWard = body.ward ? body.ward.trim() : admission.ward;
    const targetBed = body.bedNumber ? body.bedNumber.trim().toUpperCase() : admission.bedNumber;

    if (targetWard !== admission.ward || targetBed !== admission.bedNumber) {
      const occupant = await Admission.findOne({
        ward: targetWard,
        bedNumber: targetBed,
        status: 'Admitted',
        admissionId: { $ne: admission.admissionId },
      });

      if (occupant) {
        return NextResponse.json(
          {
            success: false,
            error: `Bed ${targetBed} in ${targetWard} is currently occupied by patient ${occupant.patientName} (${occupant.patientId}). Transfer aborted.`,
          },
          { status: 409 }
        );
      }

      // Check if target bed is currently undergoing biomedical maintenance
      const targetBedAsset = await Equipment.findOne({
        category: 'Hospital Bed',
        bedNumber: targetBed,
        isArchived: false,
      });

      if (targetBedAsset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(targetBedAsset.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Target Bed ${targetBed} in ${targetWard} is currently marked as "${targetBedAsset.status}" (${targetBedAsset.condition}) for servicing. Transfer aborted.`,
          },
          { status: 409 }
        );
      }

      // Record transfer event in transferHistory
      const transferEvent = {
        fromWard: admission.ward,
        fromBed: admission.bedNumber,
        toWard: targetWard,
        toBed: targetBed,
        reason: body.transferReason || body.notes || 'Inpatient Bed Transfer',
        transferredAt: new Date(),
        transferredBy: user?.name || 'Reception / Clinical Staff',
      };

      if (!admission.transferHistory) admission.transferHistory = [];
      admission.transferHistory.push(transferEvent);

      // Release previous bed in Equipment fleet
      try {
        await Equipment.findOneAndUpdate(
          { category: 'Hospital Bed', bedNumber: transferEvent.fromBed },
          {
            $set: {
              status: 'Operational',
              notes: `Vacated after transfer of ${admission.patientName} to ${targetWard} (${targetBed}) on ${new Date().toISOString().split('T')[0]}`,
            },
          }
        );

        // Allocate target bed in Equipment fleet
        if (targetBedAsset) {
          targetBedAsset.status = 'In Use';
          targetBedAsset.notes = `Occupied by ${admission.patientName} (${admission.patientId}) via Bed Transfer`;
          await targetBedAsset.save();
        } else {
          await Equipment.findOneAndUpdate(
            { category: 'Hospital Bed', bedNumber: targetBed },
            {
              $set: {
                status: 'In Use',
                notes: `Occupied by ${admission.patientName} (${admission.patientId}) via Bed Transfer`,
              },
            }
          );
        }
      } catch (eqErr) {
        console.warn('[Admissions Transfer] Warning updating equipment bed statuses:', eqErr.message);
      }

      admission.ward = targetWard;
      admission.bedNumber = targetBed;

      // Update patient assignedBed
      await Patient.findOneAndUpdate(
        { patientId: admission.patientId },
        { $set: { assignedBed: `${targetWard} - Bed ${targetBed}` } }
      );

      // Audit log
      try {
        await AuditLog.create({
          action: 'UPDATE',
          module: 'Admissions',
          description: `Transferred patient ${admission.patientName} (${admission.patientId}) from ${transferEvent.fromWard} (${transferEvent.fromBed}) to ${targetWard} (${targetBed})${body.transferReason ? ` - Reason: ${body.transferReason}` : ''}`,
          user: user?.name || 'Staff',
          userRole: user?.role || 'receptionist',
          ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
        });
      } catch (auditErr) {
        console.warn('Bed transfer audit log error:', auditErr);
      }
    }

    // Regular update with strict allowlist (prevent mass assignment of admissionId, patientId, etc.)
    const allowedFields = [
      'doctorName',
      'admittingDiagnosis',
      'admissionDate',
      'dischargeDate',
      'status',
      'notes',
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        admission[field] = body[field];
      }
    }
    await admission.save();

    return NextResponse.json({
      success: true,
      message: `Admission record ${admission.admissionId} updated successfully`,
      admission,
    });
  } catch (error) {
    console.error('[API Admission [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update admission' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const admission = await Admission.findOneAndDelete({
      $or: [
        { admissionId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!admission) {
      return NextResponse.json(
        { success: false, error: 'Admission record not found' },
        { status: 404 }
      );
    }

    // Release bed if it was still active
    if (admission.status === 'Admitted') {
      await Patient.findOneAndUpdate(
        { patientId: admission.patientId },
        {
          $set: {
            status: 'Outpatient',
            assignedBed: '',
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Admission record ${admission.admissionId} deleted`,
    });
  } catch (error) {
    console.error('[API Admission [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete admission' },
      { status: 500 }
    );
  }
}
