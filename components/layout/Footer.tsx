const Footer = ({ isDark }: { isDark?: boolean }) => {
    return (
        <footer className={`${isDark ? 'bg-[#0a0a0f] border-t border-slate-800' : 'bg-gray-800'} text-white p-4`}>
            <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
                <p>© {new Date().getFullYear()} 株AI. All rights reserved.</p>
            </div>
        </footer>
    )
}

export default Footer