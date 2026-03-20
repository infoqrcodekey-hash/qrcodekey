// ============================================
// pages/chatbot.js - AI Support Chatbot
// ============================================

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Knowledge base for the chatbot
const knowledgeBase = {
  en: {
    greeting: "Hi! I'm QRCodeKey Assistant. How can I help you today?",
    keywords: {
      'qr code|generate|create qr|make qr': "To generate a QR code:\n1. Login to your account\n2. Go to 'Generate QR' from the home screen\n3. Enter a name and category\n4. Click 'Generate' — your QR code is ready!\n\nYou can also use 'Bulk Generate' for multiple QR codes at once.",
      'attendance|clock in|clock out|check in': "For QR Attendance:\n1. Your admin creates an Organization and Group\n2. QR code is generated for the group\n3. Members scan the QR to clock in/out\n4. GPS location is verified automatically\n\nNote: GPS must be enabled on your device.",
      'scan|scanner': "To scan a QR code:\n1. Go to 'Scan' from the bottom nav\n2. Allow camera access\n3. Point your camera at the QR code\n4. The system will automatically detect and process it.",
      'gps|location|track': "QRCodeKey uses GPS for:\n• Real-time location tracking of scanned QR codes\n• Attendance verification (ensures you're at the right location)\n• Map view of all scan locations\n\nMake sure GPS is enabled in your device settings.",
      'organization|org|company|team': "Organizations help you manage teams:\n1. Go to 'Organizations' tab\n2. Create a new organization\n3. Add groups (departments/teams)\n4. Generate attendance QR for each group\n5. Members can join using invite codes.",
      'price|pricing|plan|subscription|cost|pay': "Our plans:\n• Free: 5 QR codes, basic features\n• Pro (₹299/mo): 50 QR codes, real-time alerts, priority support\n• Business (₹999/mo): Unlimited QR, API access, dedicated support\n\nVisit the Pricing page to upgrade!",
      'password|forgot|reset': "To reset your password:\n1. Go to the Login page\n2. Click 'Forgot Password'\n3. Enter your registered email\n4. Check your inbox for the reset link\n5. Set your new password.",
      'report|export|download': "To generate reports:\n1. Go to 'Reports' from the dashboard\n2. Select date range and group\n3. Choose report type (attendance, location, etc.)\n4. Click 'Download' for PDF/Excel export.",
      'help|support|contact': "Need more help?\n• Visit our Help Center: /help\n• Email us: info.qrcodekey@gmail.com\n• Or use the Contact form: /contact\n\nWe typically respond within 24 hours.",
      'leave|holiday|vacation': "Leave Management:\n1. Go to 'Leaves' from the home screen\n2. Apply for leave by selecting dates and type\n3. Your admin will approve/reject\n4. Holiday calendar shows company holidays.",
      'visitor|guest': "Visitor Management:\n1. Go to 'Visitors' from the home screen\n2. Register a new visitor with their details\n3. Generate a visitor QR pass\n4. Track visitor check-in/check-out times.",
      'shift|overtime|ot': "Shift Management:\n1. Go to 'Shifts' from the home screen\n2. Admin can create shift schedules\n3. Track overtime hours automatically\n4. View shift reports in the Reports section.",
    },
    fallback: "I'm not sure about that. Here are some things I can help with:\n• QR Code generation\n• Attendance system\n• Organizations & teams\n• Pricing & plans\n• Account & password\n• Reports & exports\n\nOr you can contact our support team at info.qrcodekey@gmail.com"
  },
  hi: {
    greeting: "नमस्ते! मैं QRCodeKey असिस्टेंट हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
    keywords: {
      'qr code|generate|बनाओ|बनाना|क्यूआर': "QR कोड बनाने के लिए:\n1. अपने अकाउंट में लॉगिन करें\n2. होम स्क्रीन से 'Generate QR' पर जाएं\n3. नाम और कैटेगरी डालें\n4. 'Generate' क्लिक करें — आपका QR कोड तैयार है!\n\nआप एक साथ कई QR कोड के लिए 'Bulk Generate' भी इस्तेमाल कर सकते हैं।",
      'attendance|हाजिरी|उपस्थिति|clock in': "QR अटेंडेंस के लिए:\n1. एडमिन Organization और Group बनाता है\n2. ग्रुप के लिए QR कोड जेनरेट होता है\n3. सदस्य QR स्कैन करके clock in/out करते हैं\n4. GPS लोकेशन ऑटोमैटिक वेरिफाई होती है\n\nनोट: आपके डिवाइस पर GPS चालू होना चाहिए।",
      'scan|स्कैन': "QR कोड स्कैन करने के लिए:\n1. नीचे nav से 'Scan' पर जाएं\n2. कैमरा एक्सेस दें\n3. कैमरा QR कोड की तरफ करें\n4. सिस्टम ऑटोमैटिक पहचान लेगा।",
      'price|pricing|कीमत|प्लान|पैसे': "हमारे प्लान:\n• Free: 5 QR कोड, बेसिक फीचर्स\n• Pro (₹299/महीना): 50 QR कोड, रियल-टाइम अलर्ट\n• Business (₹999/महीना): अनलिमिटेड QR, API एक्सेस\n\nअपग्रेड करने के लिए Pricing पेज पर जाएं!",
      'password|पासवर्ड|भूल गया': "पासवर्ड रीसेट करने के लिए:\n1. Login पेज पर जाएं\n2. 'Forgot Password' क्लिक करें\n3. अपना ईमेल डालें\n4. इनबॉक्स में रीसेट लिंक चेक करें\n5. नया पासवर्ड सेट करें।",
      'help|support|मदद|सहायता': "और मदद चाहिए?\n• Help Center: /help\n• ईमेल: info.qrcodekey@gmail.com\n• Contact फॉर्म: /contact\n\nहम 24 घंटे में जवाब देते हैं।",
    },
    fallback: "मुझे इसके बारे में पक्का नहीं पता। मैं इनमें मदद कर सकता हूँ:\n• QR कोड बनाना\n• अटेंडेंस सिस्टम\n• ऑर्गनाइजेशन और टीम\n• प्लान और कीमत\n• अकाउंट और पासवर्ड\n• रिपोर्ट\n\nया आप हमारी सपोर्ट टीम से संपर्क करें: info.qrcodekey@gmail.com"
  }
};

function getResponse(input, lang) {
  const kb = knowledgeBase[lang] || knowledgeBase.en;
  const lower = input.toLowerCase();

  for (const [pattern, response] of Object.entries(kb.keywords)) {
    const parts = pattern.split('|');
    if (parts.some(p => lower.includes(p.toLowerCase()))) {
      return response;
    }
  }
  return kb.fallback;
}

export default function Chatbot() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    const kb = knowledgeBase[lang] || knowledgeBase.en;
    setMessages([{ role: 'bot', text: kb.greeting, time: new Date() }]);
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input.trim(), time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getResponse(userMsg.text, lang);
      setMessages(prev => [...prev, { role: 'bot', text: response, time: new Date() }]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = lang === 'hi'
    ? ['QR कोड कैसे बनाएं?', 'अटेंडेंस कैसे लगाएं?', 'प्लान क्या हैं?', 'पासवर्ड भूल गया']
    : ['How to generate QR?', 'How does attendance work?', 'What are the plans?', 'Forgot my password'];

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Chat Support - QRCodeKey</title>
        <meta name="description" content="QRCodeKey AI chat support assistant" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <div>
              <div className="font-bold text-sm text-gray-200">{t('chatbotTitle')}</div>
              <div className="text-[9px] text-green-400 font-semibold">{t('online')}</div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
              <div className={`max-w-[85%] ${msg.role === 'user'
                ? 'bg-indigo-500/20 border border-indigo-500/30 rounded-2xl rounded-br-md'
                : 'bg-white/5 border border-white/10 rounded-2xl rounded-bl-md'
              } px-4 py-3`}>
                {msg.role === 'bot' && (
                  <div className="text-[10px] text-indigo-400 font-bold mb-1">🤖 QRCodeKey Bot</div>
                )}
                <div className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">{msg.text}</div>
                <div className={`text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-indigo-400/60 text-right' : 'text-gray-600'}`}>
                  {formatTime(msg.time)}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions (show only at start) */}
        {messages.length <= 1 && (
          <div className="mt-4 space-y-2">
            <div className="text-[10px] text-gray-500 font-bold uppercase text-center">{t('quickQuestions')}</div>
            <div className="grid grid-cols-2 gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const userMsg = { role: 'user', text: q, time: new Date() };
                    setMessages(prev => [...prev, userMsg]);
                    setIsTyping(true);
                    setTimeout(() => {
                      const response = getResponse(q, lang);
                      setMessages(prev => [...prev, { role: 'bot', text: response, time: new Date() }]);
                      setIsTyping(false);
                    }, 800 + Math.random() * 700);
                  }}
                  className="text-xs text-left p-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-[rgba(10,10,30,0.95)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.15)] px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            className="input-field flex-1 text-sm py-3"
            placeholder={t('typeMessage')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="btn-primary px-5 py-3 text-sm shrink-0 disabled:opacity-40"
          >
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
