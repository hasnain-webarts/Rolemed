import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-xl flex flex-col md:flex-row justify-between items-center text-outline text-body-sm gap-md border-t border-outline-variant/20 pt-lg">
      <p>© {new Date().getFullYear()} RB-HMS Hospital Systems. Clinical Excellence through Precision.</p>
      <div className="flex gap-lg">
        <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
        <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
        <Link href="#" className="hover:text-primary transition-colors">Contact Support</Link>
      </div>
    </footer>
  )
}
