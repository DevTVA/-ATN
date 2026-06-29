import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import { Spinner } from './index';

// Hàm render Markdown cơ bản để hiển thị bảng biểu và danh sách từ AI
const renderMarkdown = (text) => {
  if (!text) return '';
  
  let html = text;
  
  // 1. In đậm **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 2. Định dạng bảng biểu markdown
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  const resultLines = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHtml = '<div class="overflow-x-auto my-2 border border-brown-100 rounded-lg shadow-sm"><table class="w-full text-[11px] text-left border-collapse">';
      }
      
      const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Bỏ qua các dòng phân cách |---|---|
      if (line.includes('---')) {
        continue;
      }
      
      const isHeader = !tableHtml.includes('</th>') && !tableHtml.includes('</td>');
      tableHtml += `<tr class="border-b border-brown-50 hover:bg-brown-50/50">`;
      for (const col of cols) {
        if (isHeader) {
          tableHtml += `<th class="p-1.5 bg-brown-100/50 font-bold text-brown-900 border-r border-brown-50">${col}</th>`;
        } else {
          tableHtml += `<td class="p-1.5 text-brown-800 border-r border-brown-50">${col}</td>`;
        }
      }
      tableHtml += '</tr>';
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += '</table></div>';
        resultLines.push(tableHtml);
        tableHtml = '';
      }
      resultLines.push(line);
    }
  }
  
  if (inTable) {
    tableHtml += '</table></div>';
    resultLines.push(tableHtml);
  }
  
  html = resultLines.join('\n');

  // 3. Định dạng danh sách gạch đầu dòng
  html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li class="ml-4 list-disc my-0.5">$1</li>');

  // 4. Thay thế xuống dòng thành thẻ <br/>
  html = html.replace(/\n/g, '<br/>');
  
  return <div dangerouslySetInnerHTML={{ __html: html }} className="ai-message-html text-xs leading-relaxed space-y-1" />;
};

const SUGGESTIONS = [
  { text: 'Doanh thu hôm nay thế nào?', label: '💰 Doanh thu hôm nay' },
  { text: 'Món nào bán chạy nhất tháng này?', label: '🔥 Món bán chạy nhất' },
  { text: 'Hiện tại có bao nhiêu bàn đang trống?', label: '🪑 Bàn trống hiện tại' },
  { text: 'Danh sách các đơn hàng gần đây nhất?', label: '📋 Đơn hàng gần đây' }
];

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là **Quậy** - Trợ Lý Thông Minh của quán Tí ☕\n\nTôi có thể giúp bạn tra cứu báo cáo doanh thu, sản phẩm bán chạy hoặc kiểm tra tình trạng bàn bằng tiếng Việt. Hãy hỏi tôi bất cứ điều gì nhé!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput('');
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { message: text });
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: '❌ Đã xảy ra lỗi khi kết nối với AI Chatbot. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-brown-800 hover:bg-brown-900 text-brown-100 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-brown-200"
          title="Hỏi trợ lý AI"
        >
          <span className="text-2xl">🤖</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </button>
      )}

      {/* Chat Box Dialog */}
      {isOpen && (
        <div className="w-[360px] h-[500px] bg-white rounded-2xl border border-brown-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fade-in">
          {/* Header */}
          <div className="bg-brown-800 p-4 text-brown-50 flex justify-between items-center border-b border-brown-950">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <div className="font-serif font-bold text-sm leading-none">Quậy</div>
                <div className="text-[10px] text-green-400 font-bold mt-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                  Trợ lý báo cáo thông minh
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-brown-200 hover:text-white transition-colors p-1"
            >
              <i className="ti ti-x text-lg" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-brown-50/20 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-brown-700 text-white rounded-tr-none'
                      : 'bg-white text-brown-900 border border-brown-100 rounded-tl-none'
                  }`}
                >
                  {renderMarkdown(m.text)}
                </div>
              </div>
            ))}

            {/* Loading / Typing Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-brown-900 border border-brown-100 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-[10px] text-brown-500 font-semibold italic">AI đang phân tích dữ liệu...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && !loading && (
            <div className="px-4 py-2 border-t border-brown-100 bg-white">
              <div className="text-[10px] font-bold text-brown-400 uppercase tracking-wide mb-1.5">Gợi ý câu hỏi nhanh:</div>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.text)}
                    className="text-left text-xs bg-brown-50 hover:bg-brown-100 text-brown-800 px-3 py-1.5 rounded-lg border border-brown-100 hover:border-brown-200 transition-all font-medium"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t border-brown-100 bg-white flex gap-2 items-center">
            <input
              type="text"
              className="input text-xs py-2 flex-1 rounded-xl border-brown-200 bg-brown-50/50"
              placeholder="Hỏi về doanh thu, bàn trống, món bán chạy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              className="btn btn-primary p-2 w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              disabled={loading || !input.trim()}
            >
              <i className="ti ti-send text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
