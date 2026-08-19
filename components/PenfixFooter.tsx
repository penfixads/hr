export default function PenfixFooter() {
  return (
    <footer style={{ backgroundColor: '#4A0000' }} className="text-white mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-4 text-center text-sm text-white/70">
        &copy; {new Date().getFullYear()} Penfix Advertising and Business Solutions. All rights reserved.
      </div>
    </footer>
  )
}
