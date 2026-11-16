import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function Home() {

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="px-12 py-18 h-screen flex items-center justify-center">
          <div className="grid max-w-7xl px-4 py-12 mx-auto lg:gap-8 xl:gap-0 lg:py-16 lg:grid-cols-12">
            <div className="mr-auto place-self-center lg:col-span-7">
              <h1 className="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl">Digitize Your Hospital Operations <span className="text-[#1565C0]">with Ease</span></h1>
              <p className="max-w-2xl mb-6 font-light text-gray-800 lg:mb-8 md:text-lg lg:text-xl">Experience a seamless healthcare ecosystem designed for clinical precision and human empathy. RB-HMS empowers clinicians and administrators with real-time data and role-based efficiency.</p>
              <Link href="/login" className="inline-flex items-center justify-center px-5 py-3 mr-3 text-base font-medium text-center bg-[#1565C0] rounded-lg  focus:ring-4 focus:ring-[#1565C0]-300 text-white hover:bg-[#1565C0]/90 dark:focus:ring-[#1565C0]-900 font-semibold">
                Access Portal
                <svg className="w-5 h-5 ml-2 -mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
              </Link>
              <Link href="#features" className="inline-flex items-center justify-center px-5 py-3 text-base text-center text-gray-900 border-[#1565C0] border-2 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-semibold">
                Explore Features
              </Link>
            </div>
            <div className="hidden lg:mt-0 lg:col-span-5 lg:flex rounded-xl  overflow-hidden">
              <img src="/assets/hero-image.png" alt="mockup" />
            </div>
          </div>
        </section>
        {/* Trust Bar */}
        <section className="px-12 py-12 bg-blue-300/20">
          <div className="px-8 max-w-7xl mx-auto text-center space-y-4">
            <p className="font-label-caps text-[#727783] uppercase tracking-widest mb-6">Trusted by leading healthcare providers</p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 text-lg grayscale hover:grayscale-0 transition-all duration-500">
              <div className="font-bold text-2xl text-[#424752]">MEDICORE</div>
              <div className="font-bold text-2xl text-[#424752]">HEALTH+</div>
              <div className="font-bold text-2xl text-[#424752]">CLINIC_OS</div>
              <div className="font-bold text-2xl text-[#424752]">PHARMA_LOGIC</div>
            </div>
          </div>
        </section>
        {/* Features Grid */}
        <section className="px-12 py-12 max-w-7xl mx-auto space-y-4">
          <div className="text-center mb-xl">
            <h2 className="font-semibold text-xl mb-1">Powerful Modules for Every Role</h2>
            <p className="text-[#424752]">Streamlined workflows for your entire medical team.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-gutter gap-6">
            {/* Patient Management */}
            <div className="bg-white p-4 leading-4.5 rounded-xl border border-gray-50/50 shadow-sm hover:shadow-md transition-all group">
              <div className="duotone-icon w-16 h-16 mb-3">
                <span className="">
                  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-round-icon lucide-user-round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
                </span>
              </div>
              <h3 className="font-semibold my-1 mb-2">Patient Management</h3>
              <p className="text-[#424752]">Complete medical history and registration in one click.</p>
            </div>
            {/* Doctor Dashboard */}
            <div className="bg-white p-4 leading-4.5 rounded-xl border border-gray-50/50 shadow-sm hover:shadow-md transition-all">
              <div className="duotone-icon w-16 h-16 mb-3">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width={42} height={42} viewBox="0 0 640 640" fill="#1565C0" ><path d="M64 112C64 85.5 85.5 64 112 64L160 64C177.7 64 192 78.3 192 96C192 113.7 177.7 128 160 128L128 128L128 256C128 309 171 352 224 352C277 352 320 309 320 256L320 128L288 128C270.3 128 256 113.7 256 96C256 78.3 270.3 64 288 64L336 64C362.5 64 384 85.5 384 112L384 256C384 333.4 329 398 256 412.8L256 432C256 493.9 306.1 544 368 544C429.9 544 480 493.9 480 432L480 346.5C442.7 333.3 416 297.8 416 256C416 203 459 160 512 160C565 160 608 203 608 256C608 297.8 581.3 333.4 544 346.5L544 432C544 529.2 465.2 608 368 608C270.8 608 192 529.2 192 432L192 412.8C119 398 64 333.4 64 256L64 112zM512 288C529.7 288 544 273.7 544 256C544 238.3 529.7 224 512 224C494.3 224 480 238.3 480 256C480 273.7 494.3 288 512 288z" /></svg>
                </span>
              </div>
              <h3 className="font-semibold my-1 mb-2">Doctor Dashboard</h3>
              <p className="text-[#424752]">Personalized views for appointments and clinical notes.</p>
            </div>
            {/* Lab Reports */}
            <div className="bg-white p-4 leading-4.5 rounded-xl border border-gray-50/50 shadow-sm hover:shadow-md transition-all">
              <div className="duotone-icon w-16 h-16 mb-3">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width={42} height={42} viewBox="0 0 640 640" fill="#1565C0"><path d="M384 64L224 64C206.3 64 192 78.3 192 96C192 113.7 206.3 128 224 128L224 279.5L103.5 490.3C98.6 499 96 508.7 96 518.7C96 550.4 121.6 576 153.3 576L486.7 576C518.3 576 544 550.4 544 518.7C544 508.7 541.4 498.9 536.5 490.3L416 279.5L416 128C433.7 128 448 113.7 448 96C448 78.3 433.7 64 416 64L384 64zM288 279.5L288 128L352 128L352 279.5C352 290.6 354.9 301.6 360.4 311.3L402 384L238 384L279.6 311.3C285.1 301.6 288 290.7 288 279.5z" /></svg>
                </span>
              </div>
              <h3 className="font-semibold my-1 mb-2">Lab Reports</h3>
              <p className="text-[#424752]">Digital result tracking and instant notification for patients.</p>
            </div>
            {/* Pharmacy Inventory */}
            <div className="bg-white p-4 leading-4.5 rounded-xl border border-gray-50/50 shadow-sm hover:shadow-md transition-all">
              <div className="duotone-icon w-16 h-16 mb-3">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-syringe-icon lucide-syringe"><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" /></svg>
                </span>
              </div>
              <h3 className="font-semibold my-1 mb-2">Pharmacy Inventory</h3>
              <p className="text-[#424752]">Real-time stock monitoring and prescription integration.</p>
            </div>
            {/* RBAC */}
            <div className="bg-white p-4 leading-4.5 rounded-xl border border-gray-50/50 shadow-sm hover:shadow-md transition-all">
              <div className="duotone-icon w-16 h-16 mb-3">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-round-key-icon lucide-user-round-key"><path d="M19 11v6" /><path d="M19 13h2" /><path d="M2 21a8 8 0 0 1 12.868-6.349" /><circle cx="10" cy="8" r="5" /><circle cx="19" cy="19" r="2" /></svg>
                </span>
              </div>
              <h3 className="font-semibold my-1 mb-2">Role-Based Access</h3>
              <p className="text-[#424752]">Secure, permissioned access for different hospital tiers.</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-12 py-12 bg-blue-300/20" id="features">
          <div className="px-8 max-w-7xl mx-auto">
            <h2 className="font-semibold text-2xl text-center mb-10">The Patient Journey Redefined</h2>
            <div className="flex flex-col lg:flex-row items-start justify-between gap-12 relative">
              <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-[#1565C0]/20 -z-10"></div>
              <div className="flex-1 flex flex-col items-center text-center gap-4 leading-4.5">
                <div className="w-16 h-16 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-xl shadow-lg">1</div>
                <h4 className="font-semibold mt-6 mb-4">Register Patient</h4>
                <p className="text-[#424752]">Instant entry of patient details and triage info.</p>
              </div>
              <div className="flex-1 flex flex-col items-center text-center gap-4 leading-4.5">
                <div className="w-16 h-16 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-xl shadow-lg">2</div>
                <h4 className="font-semibold mt-6 mb-4">Doctor Consultation</h4>
                <p className="text-[#424752]">E-prescriptions and clinical diagnosis logging.</p>
              </div>
              <div className="flex-1 flex flex-col items-center text-center gap-4 leading-4.5">
                <div className="w-16 h-16 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-xl shadow-lg">3</div>
                <h4 className="font-semibold mt-6 mb-4">Lab Testing</h4>
                <p className="text-[#424752]">Seamless integration with diagnostic laboratory systems.</p>
              </div>
              <div className="flex-1 flex flex-col items-center text-center gap-4 leading-4.5">
                <div className="w-16 h-16 rounded-full bg-[#1565C0] flex items-center justify-center text-white font-bold text-xl shadow-lg">4</div>
                <h4 className="font-semibold mt-6 mb-4">Prescription</h4>
                <p className="text-[#424752]">Direct pharmacy billing and medicine dispensation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Previews (Asymmetric/Layered Layout) */}
        <section className="px-12 py-12 max-w-7xl mx-auto" id="benefits">
          <div className="grid lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-semibold text-2xl">Unified Interface for Every Specialist</h2>
              <div className="space-y-4">
                <div className="p-6 bg-white border-l-4 border-[#1565C0] rounded-r-lg shadow-sm cursor-pointer leading-4">
                  <h4 className="font-semibold mb-2 text-[#1565C0]">Admin Control Center</h4>
                  <p className="">Manage hospital resources, staff scheduling, and revenue analytics in real-time.</p>
                </div>
                <div className="p-6 hover:bg-white transition-all rounded-lg group cursor-pointer leading-4">
                  <h4 className="font-semibold mb-2 group-hover:text-[#1565C0]">Clinical Hub</h4>
                  <p className="text-[#424752]">Doctors can view vitals, history, and suggest treatments from any device.</p>
                </div>
                <div className="p-6 hover:bg-white transition-all rounded-lg group cursor-pointer leading-4">
                  <h4 className="font-semibold mb-2 group-hover:text-[#1565C0]">Pharmacy Interface</h4>
                  <p className="text-[#424752]">Inventory management with automated re-ordering and patient billing.</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 rounded-xl bg-blue-300/20 relative overflow-hidden h-125">
              <div className="absolute inset-0 translate-x-12 translate-y-12 bg-white rounded-xl shadow-2xl border border-gray-50/30">
                <img alt="Clinical Data Analytics View" className="w-full h-full object-cover rounded-xl" data-alt="A highly detailed data visualization dashboard for a chief medical officer, showing colorful charts and healthcare metrics. The background is a clean white workspace with subtle blue tints. The UI elements include progress rings, patient load maps, and staff performance graphs, all rendered with sharp, high-contrast typography and a modern healthcare professional aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPl_U3okcdw2v7EJV-qT-1aMdyF6fEfMQJh7fNu21uO3BwhS-iL3ycsLKQUe3E7wJsh4vyzfo6nCyR2K8z75NsCLP4DBpcxiiqE0f3sRoYNcL6SmMLR2oVx8cc8x_VF4fwnfqmg2U_vfPJaUR6wR32BA1ouCv2IgUl87pRtxXBbAt1DglFPpc-GLwzkl94n-0kuXC20mfhoBUG5bW4mqOK8_m922g06x2cIJ5-1d94Y2XyyFuEKNNy9gFA_RdaG4ATAd4sa3jOISkd" />
              </div>
            </div>
          </div>
        </section>

        {/* Staff Module */}
        <section className="px-12 py-12 bg-surface" id="doctors">
          <div className="px-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="font-semibold text-2xl">Meet our Specialist Modules</h2>
                <p className="text-[#424752]">Systems tailored for high-performance clinical teams.</p>
              </div>
              <Link href="/login" className="hidden md:block text-primary font-bold hover:underline">
                Explore Clinical Staff
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Specialist 1 */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition-transform">
                <img alt="Chief Medical Officer" className="w-full h-48 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtZDZ50_7mbUAunWgG5wv27gcQnAx1WXclAcGWY-MyUNnJSy2o888KxeCtlKSMNykpc0d7RYpSTLw7uFLAYLvEgvvkrrflFG7D6untiKRdi4d9El4xKPEN6hVyc8htETwm_8hTzDNzQhy0xkYuJXcx6n0gq0A96vd1NBBjCA2xiwbY-ADg0hmV7YL9wdoJYalQxcmuQVKslrNlhK37oQxC6-7rHUyaEeFNfGjyepSYDmtt-fRAinecd6p-bOqaJfuHsR5R1Vo98G0G" />
                <div className="p-4 leading-4.5">
                  <h4 className="text-lg font-semibold">Dr. Sarah Johnson</h4>
                  <p className="text-sm text-secondary font-semibold mb-3">Chief Medical Officer</p>
                  <Link href="/login" className="block text-center w-full py-2 border border-primary text-primary font-bold rounded-full hover:bg-primary/10 transition-all cursor-pointer">View Portal Profile</Link>
                </div>
              </div>
              {/* Specialist 2 */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition-transform">
                <img alt="Pediatric Specialist" className="w-full h-48 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCidbyaVPIuF_J4sx2z7DlUCXEmRBeMyLI5ixeJgP57zHsbNEGlZa2lRCnUjhP3rtakAHdDGNTb9FqWrJO3jt613r9wgeY1VlMOlZsQvuW4A8wfnytIDqaJeOr5ziS94V1vRzD44j3GUdtMTupccTXe5czRUkes64TapHAInfpleMJwDvMdqMU9NDCKpEdSxUCazNR6Xv3Rkp4pb2X7e4ARI41jSFyyPXEuXXOnaLLoqA90WTo41bDnKNsuFKjBCvS7POol82wk3tEZ" />
                <div className="p-4 leading-4.5">
                  <h4 className="text-lg font-semibold">Dr. Michael Chen</h4>
                  <p className="text-sm text-secondary font-semibold mb-3">Lead Pharmacist</p>
                  <Link href="/login" className="block text-center w-full py-2 border border-primary text-primary font-bold rounded-full hover:bg-primary/10 transition-all cursor-pointer">View Portal Profile</Link>
                </div>
              </div>
              {/* Specialist 3 */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition-transform">
                <img alt="Surgical Lead" className="w-full h-48 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC59q2dd8x70uQiUeJHMK3R3EqX4NHJ8oHdsUW5ut0twlBjGtVayatsWSt3Z_ohg16Sw9lOipoJbnISKkrcWerHuCMuSjNFmlar7vsJs5B5rlkTFsoums6vAYSKuqNs5yjeHhdQGPUdfCITc9QSu9skvt8kV6--wKcyjjgEaUce8no2-TNlE01lUnbLzLpZW41vYD3rGpthrHFx7mnYu19TlWJZtRembIUPd1yOG7phE850d1NumnIyIO-nu6fXEsLJDw4ryrhqj7KW" />
                <div className="p-4 leading-4.5">
                  <h4 className="text-lg font-semibold">Dr. Elena Rodriguez</h4>
                  <p className="text-sm text-secondary font-semibold mb-3">Surgical Director</p>
                  <Link href="/login" className="block text-center w-full py-2 border border-primary text-primary font-bold rounded-full hover:bg-primary/10 transition-all cursor-pointer">View Portal Profile</Link>
                </div>
              </div>
              {/* Specialist 4 */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition-transform">
                <img alt="Laboratory Head" className="w-full h-48 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIN1hDaWl_ZhRA2TP5v3VOdOFC4aBIwtg5JpuhykgrqC17_-RZGrKhS_1xSzNepSrXii-l7LNXsm2MMj0cKZ9mlzNBm04GrXvxQsxlSsOjEXsxUzCCa-383MwMyy2HpNHOjv9ldnGEC1myXsDdFBknbSTnS-Q9WjfHqQR1Y-7UQDDI3GvbFtINpGEaacypHtV0STmkjTm_pny0P1HDL_iVHHP7XoBQrCgPCJ_RedtjIpmoCQazLbbgPbEYjgYaSA2SICS7cL3hO6u0" />
                <div className="p-4 leading-4.5">
                  <h4 className="text-lg font-semibold">Dr. James Wilson</h4>
                  <p className="text-sm text-secondary font-semibold mb-3">Lab Manager</p>
                  <Link href="/login" className="block text-center w-full py-2 border border-primary text-primary font-bold rounded-full hover:bg-primary/10 transition-all cursor-pointer">View Portal Profile</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits & Testimonials */}
        <section className="px-12 py-12 max-w-7xl mx-auto grid lg:grid-cols-2 gap-xl">
          {/* Benefits */}
          <div className="space-y-12">
            <h2 className="text-2xl font-semibold">Why Hospitals Choose RB-HMS</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#d6e3ff] p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check-icon lucide-shield-check"><path fill="#1565C0" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path stroke="#d6e3ff" d="m9 12 2 2 4-4" /></svg>
                </div>
                <div>
                  <h4 className="font-bold">Secure Data Handling</h4>
                  <p className="text-sm text-[#424752]">HIPAA compliant encryption for all patient records.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#d6e3ff] p-1 rounded-full">
                  <svg viewBox="0 0 512 512" width="24" height="24" fill="#1565C0" xmlns="http://www.w3.org/2000/svg"><path d="m467 331c-11.191406 0-21.316406 4.253906-29.195312 11.039062l-84.324219-47.605468c4.722656-11.933594 7.519531-24.839844 7.519531-38.433594 0-26.410156-10.136719-50.289062-26.296875-68.761719l85.144531-99.359375c5.027344 1.945313 10.441406 3.121094 16.152344 3.121094 24.8125 0 45-20.1875 45-45s-20.1875-46-45-46-45 21.1875-45 46c0 8.144531 2.34375 15.683594 6.140625 22.28125l-85.066406 99.269531c-16.261719-10.347656-35.417969-16.550781-56.074219-16.550781-16.148438 0-31.277344 3.96875-44.957031 10.511719l-39.128907-58.683594c5.628907-7.515625 9.085938-16.738281 9.085938-26.828125 0-24.8125-20.1875-45-45-45s-45 20.1875-45 45 20.1875 45 45 45c3.804688 0 7.4375-.617188 10.96875-1.507812l39.152344 58.722656c-21.390625 19.234375-35.121094 46.820312-35.121094 77.785156 0 9.386719 1.636719 18.324219 3.960938 26.988281l-77.023438 32.582031c-8.226562-8.898437-19.890625-14.570312-32.9375-14.570312-24.8125 0-45 20.1875-45 45s20.1875 45 45 45 45-20.1875 45-45c0-.976562-.226562-1.886719-.285156-2.847656l77.019531-32.582032c18.453125 30.070313 51.335937 50.355469 89.105469 50.414063l9.335937 66.363281c-14.296875 7.546875-24.175781 22.390625-24.175781 39.652344 0 24.8125 20.1875 45 45 45s45-20.1875 45-45c0-21.78125-15.5625-39.980469-36.148438-44.105469l-9.371093-66.628906c21.234375-6.269531 39.546875-18.910156 52.875-35.925781l84.449219 47.683594c-.46875 2.597656-.804688 5.246093-.804688 7.976562 0 24.8125 20.1875 45 45 45s45-20.1875 45-45-20.1875-45-45-45zm0 0" /></svg>
                </div>
                <div>
                  <h4 className="font-bold">Centralized System</h4>
                  <p className="text-sm text-[#424752]">Sync all departments under a single unified database.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#d6e3ff] p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock-icon lucide-clock"><circle fill="#1565C0" cx="12" cy="12" r="10" /><path stroke="#d6e3ff" d="M12 6v6l4 2" /></svg>
                </div>
                <div>
                  <h4 className="font-bold">Time Efficiency</h4>
                  <p className="text-sm text-[#424752]">Reduce manual entry by 40% with automated workflows.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#d6e3ff] p-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#1565C0" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10" /><line stroke="#d6e3ff" x1="12" x2="12" y1="8" y2="12" /><line stroke="#d6e3ff" x1="12" x2="12.01" y1="16" y2="16" /></svg>
                </div>
                <div>
                  <h4 className="font-bold">Error Reduction</h4>
                  <p className="text-sm text-[#424752]">Eliminate pharmacy errors with e-prescriptions.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Testimonials */}
          <div className="bg-[#e6f6ff] rounded-xl p-12 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-[#66d9cc] mb-1">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
              </div>
              <p className="italic mb-6">&quot;Implementing RB-HMS transformed our daily operations. The role-based access ensures security while significantly speeding up patient processing time.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#c7dde9]"></div>
                <div>
                  <h5 className="font-bold text-sm">Arthur Vance</h5>
                  <p className="text-xs text-[#727783]">Hospital Administrator, City General</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-[#66d9cc] mb-1">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#00ddd2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                </span>
              </div>
              <p className="italic mb-6">&quot;As a CMO, having a bird&apos;s-eye view of all clinical modules allows us to maintain the highest standards of patient care with zero compromises.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#c7dde9]"></div>
                <div>
                  <h5 className="font-bold text-sm">Dr. Linda K.</h5>
                  <p className="text-xs text-[#727783]">Chief Medical Officer</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-12 py-12 max-w-7xl mx-auto">
          <div className="bg-[#1565c0] rounded-3xl p-16 text-center text-white space-y-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-40"></div>
            <div className="relative z-10">
              <h2 className="font-semibold text-2xl mb-1">Start Managing Your Hospital Digitally Today</h2>
              <p className="text-[#dae5ff] max-w-2xl mx-auto mb-12">Join 500+ clinics and hospitals worldwide who have scaled their operations with our role-based precision management system.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link 
                  href="/login" 
                  className="inline-block px-12 py-4 bg-white text-primary font-bold rounded-2xl shadow-lg hover:scale-105 transition-transform cursor-pointer text-base"
                >
                  Access Staff Portal
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main >
      <Footer />
    </>
  );
}
