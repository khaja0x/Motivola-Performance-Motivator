import { Layers, ArrowRight, ShieldCheck, Zap, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] font-sans selection:bg-[#cca565]/20 selection:text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#fdfbf7]/80 backdrop-blur-md border-b border-[#cca565]/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#cca565] rounded-xl shadow-[0_4px_12px_rgba(204,165,101,0.25)]">
              <Layers size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">Motivola</span>
          </div>
          <div className="flex items-center space-x-8">
            <Link href="/login" className="text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="bg-[#cca565] text-white px-6 py-2.5 rounded-full text-[13px] font-bold hover:bg-[#bd9756] transition-all transform hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(204,165,101,0.25)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 bg-gradient-to-br from-[#fdfbf7] via-[#f3e5d0] to-[#dfbe89]/40">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-[#cca565]/10 text-[#cca565] rounded-full text-[13px] font-bold uppercase tracking-wider mb-8 animate-fade-in border border-[#cca565]/20">
            <Zap size={14} strokeWidth={2.5} />
            <span>Powering Sales Excellence</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-8">
            Motivate your team, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cca565] to-[#bd9756]">
              automate performance.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-500 font-medium leading-relaxed mb-12">
            The multi-tenant performance motivator for modern sales businesses. Track sales, calculate tiered commissions, and send automated WhatsApp updates.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto bg-[#cca565] text-white px-10 py-4 rounded-[18px] text-[15px] font-bold hover:bg-[#bd9756] transition-all shadow-[0_12px_30px_rgba(204,165,101,0.25)] flex items-center justify-center space-x-2 group"
            >
              <span>Launch Dashboard</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            {/* <button className="w-full sm:w-auto bg-white text-gray-900 border border-[#cca565]/10 px-10 py-4 rounded-[18px] text-[15px] font-bold hover:bg-gray-50 transition-all">
              Live Demo
            </button> */}
          </div>

          {/* Abstract UI Backdrop */}
          <div className="mt-24 relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-[#cca565]/10 blur-[140px] -z-10 rounded-full"></div>
            <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-white overflow-hidden transform hover:-translate-y-2 transition-transform duration-700">
              <div className="h-16 bg-gray-50/50 border-b border-gray-100 flex items-center px-8 space-x-2">
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              </div>
              <div className="p-10 aspect-[16/9] bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                 <div className="text-[#cca565]/40 text-sm font-bold tracking-[0.3em] uppercase">Platform Preview</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16 text-center md:text-left">
          {[
            { 
              icon: BarChart3, 
              title: 'Dynamic Rules', 
              desc: 'Define complex, tiered commission structures based on quantity or total sales amount.' 
            },
            { 
              icon: MessageSquare, 
              title: 'WhatsApp Alerts', 
              desc: 'Automated performance updates directly to staff via WhatsApp to keep motivation high.' 
            },
            { 
              icon: ShieldCheck, 
              title: 'Multi-Tenant', 
              desc: 'Secure data isolation for every company, allowing managers to focus on their unique teams.' 
            }
          ].map((f, i) => (
            <div key={i} className="group space-y-6">
              <div className="inline-flex p-5 bg-[#cca565]/10 rounded-2xl text-[#cca565] shadow-[0_8px_20px_rgba(204,165,101,0.08)] mb-2 group-hover:scale-110 transition-transform duration-500">
                <f.icon size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{f.title}</h3>
              <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100 bg-[#fdfbf7]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-gray-400 text-[13px] font-medium">
          <div className="flex items-center space-x-4 mb-8 md:mb-0">
            <div className="p-2 bg-[#cca565] rounded-xl">
              <Layers size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Motivola</span>
            <span className="text-gray-200">|</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex space-x-12">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


