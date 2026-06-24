import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, ShieldAlert, Sparkles, User, HelpCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  text: string;
  type: 'user' | 'bot' | 'system';
  image?: string;
  isImageReviewQuestion?: boolean;
  agentNote?: string;
  recommendedAction?: string;
}

export const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: 'Hi! I am the FoodFix Support Assistant. How can I help you with your order issues today?', type: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isEscalated, setIsEscalated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingImageQuery, setPendingImageQuery] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  const handleSend = async (text: string = input, image?: { base64: string, mimeType: string }) => {
    if (!text.trim() && !image) return;
    
    setIsProcessing(true);
    if (!image) {
      setMessages(prev => [...prev, { text, type: 'user' }]);
      setInput('');
    }

    try {
      if (image) {
        const response = await fetch('/api/image-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            customer_query: pendingImageQuery || 'Food quality complaint with uploaded image', 
            history: messages, 
            image_base64: image.base64, 
            mime_type: image.mimeType 
          }),
        });
        const data = await response.json();
        
        setMessages(prev => [...prev, { 
          text: data.customer_reply, 
          type: 'bot',
          agentNote: data.agent_note,
          recommendedAction: data.recommended_action
        }]);

        if (data.recommended_action === "Human review" || data.customer_reply.toLowerCase().includes("support agent") || data.customer_reply.toLowerCase().includes("human")) {
          setIsEscalated(true);
        }
        setPendingImageQuery(null);
      } else {
        const response = await fetch('/api/text-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_query: text, history: messages }),
        });
        const data = await response.json();
        
        setMessages(prev => [...prev, { text: data.customer_reply, type: 'bot' }]);
        
        if (data.is_escalated) {
          setIsEscalated(true);
        }
        
        if (data.image_needed) {
          setPendingImageQuery(text);
          setMessages(prev => [...prev, { 
            text: 'To process your food quality complaint, our policy requires a visual review. Please upload a clear photo of the food.', 
            type: 'bot', 
            isImageReviewQuestion: true 
          }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { text: 'Sorry, I encountered an error. Let me connect you to a live support agent.', type: 'bot' }]);
      setIsEscalated(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageBase64 = (event.target?.result as string).split(',')[1];
        const mimeType = e.target.files![0].type;
        setMessages(prev => [...prev, { text: '📷 Uploaded file check requested', type: 'user', image: event.target?.result as string }]);
        handleSend('Analyzing food photo', { base64: imageBase64, mimeType });
      }
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  const triggerResetEscalation = () => {
    setIsEscalated(false);
    setMessages([
      { text: 'Chat reset. Support Assistant is ready to help you again!', type: 'bot' }
    ]);
  };

  return (
    <>
      {!isOpen && (
        <button 
          id="btn_support_trigger"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-orange-500 text-white p-5 rounded-full shadow-2xl flex items-center gap-3 hover:bg-orange-600 transition font-bold"
        >
          <MessageSquare size={22} className="animate-bounce" />
          <span className="text-sm">Order Help</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            id="window_support_chat"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className={`p-4 transition duration-300 ${isEscalated ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-full">
                    {isEscalated ? <ShieldAlert size={20} className="text-white" /> : <Sparkles size={20} className="text-white" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">FoodFix Support System</h3>
                    <p className="text-[10px] text-white/80">
                      {isEscalated ? "🔴 Escalation Specialist Active" : "⚡ AI Policy Assistant Online"}
                    </p>
                  </div>
                </div>
                <button id="btn_close_chat" onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition">
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Notification Bar */}
            {isEscalated ? (
              <div className="bg-red-50 p-2 px-4 flex justify-between items-center border-b border-red-100 text-[11px] text-red-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Escalated to human support agent.
                </span>
                <button onClick={triggerResetEscalation} className="text-red-500 underline hover:text-red-700">
                  Reset
                </button>
              </div>
            ) : (
              <div className="bg-orange-50/50 p-2 px-4 flex items-center gap-1.5 border-b border-orange-100/50 text-[11px] text-orange-700 font-medium">
                <CheckCircle2 size={13} className="text-orange-500" />
                <span>Answers restricted strictly to official FoodFix policy.</span>
              </div>
            )}
            
            {/* Messages body */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.type === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Sender Labels */}
                  <span className="text-[9px] text-slate-400 font-semibold mb-1 px-1">
                    {m.type === 'user' ? 'You' : (isEscalated ? 'Escalation Specialist' : 'Policy Assistant')}
                  </span>
                  
                  {/* Message Bubble */}
                  <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                    m.type === 'user' 
                      ? 'bg-orange-500 text-white rounded-tr-none' 
                      : m.type === 'system'
                        ? 'bg-slate-200 text-slate-700 rounded-none w-full max-w-full text-center'
                        : isEscalated && m.type === 'bot'
                          ? 'bg-red-50 text-slate-800 border-l-4 border-red-500 shadow-sm rounded-tl-none'
                          : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
                  }`}>
                    {m.text}
                    {m.image && <img src={m.image} alt="upload" className="mt-2.5 rounded-xl max-w-full border border-slate-100" />}
                    
                    {/* Image Upload Button Trigger */}
                    {m.isImageReviewQuestion && (
                      <div className="mt-3.5 flex gap-2">
                        <button 
                          onClick={() => { 
                            setMessages(prev => [...prev, { text: 'Connecting to image uploader...', type: 'user' }]); 
                            fileInputRef.current?.click(); 
                          }} 
                          className="bg-orange-500 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-orange-600 transition flex items-center gap-1"
                        >
                          <ImageIcon size={14} />
                          Upload Photo
                        </button>
                        <button 
                          onClick={() => { 
                            setMessages(prev => [...prev, { text: 'No photo available', type: 'user' }]); 
                            handleSend('No image available'); 
                          }} 
                          className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition"
                        >
                          No Image
                        </button>
                      </div>
                    )}

                    {/* Agent Inspector for Multimodal Quality Analysis */}
                    {m.agentNote && (
                      <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono border border-slate-800 shadow-lg">
                        <div className="text-orange-400 font-bold mb-1.5 flex items-center gap-1 uppercase tracking-wider text-[9px]">
                          <ShieldAlert size={12} className="text-orange-400" />
                          FoodFix Inspector Output
                        </div>
                        <div className="space-y-1 text-slate-300">
                          <div>
                            <span className="text-slate-400 font-medium">Internal Note:</span> {m.agentNote}
                          </div>
                          <div className="pt-1.5 mt-1.5 border-t border-slate-800">
                            <span className="text-slate-400 font-medium">Recommended Action:</span>{' '}
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              m.recommendedAction?.toLowerCase().includes('refund') 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' 
                                : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                            }`}>
                              {m.recommendedAction}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-slate-400 text-[10px] px-1 font-medium italic animate-pulse">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  Analyzing inputs with FoodFix policy...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Form Input Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <button 
                className="p-2.5 text-slate-400 hover:text-orange-500 rounded-xl hover:bg-orange-50 transition" 
                onClick={() => fileInputRef.current?.click()}
                title="Upload Photo or Complaint Image"
              >
                <ImageIcon size={20} />
              </button>
              <input 
                id="input_chat_box"
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isEscalated ? "Describe details for human agent..." : "Ask policy or report issues..."} 
                className="flex-grow text-xs border border-slate-100 bg-slate-100/50 p-2.5 px-4 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition"
              />
              <button 
                id="btn_send_chat"
                onClick={() => handleSend()} 
                className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
