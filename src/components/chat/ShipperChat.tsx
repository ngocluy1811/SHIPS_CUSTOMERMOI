import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, XIcon, ImageIcon, SmileIcon, MicIcon, VideoIcon } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';
import { socket } from '../../socket';
import axios from '../../api/axios';
import { API_URL } from '../../config';

interface Message {
  id: string;
  sender: 'user' | 'shipper';
  content?: string;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'audio' | 'emoji' | 'call_end';
  fileUrl?: string;
  orderId?: string;
}
interface ShipperChatProps {
  isOpen: boolean;
  onClose: () => void;
  shipper: {
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'busy';
    id?: string;
    userId?: string;
  };
  orderId?: string;
}
const ShipperChat = ({ isOpen, onClose, shipper, orderId }: ShipperChatProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callEndMessage, setCallEndMessage] = useState<string | null>(null);

  // Định nghĩa endpoint upload chuẩn
  const UPLOAD_ENDPOINT = '/upload';

  // Helper: chuẩn hóa orderId để join room đúng
  function normalizeOrderId(id?: string) {
    if (!id) return '';
    return id.startsWith('order_') ? id : `order_${id}`;
  }

  // Khi mở lại chat, reset allMessages và load lại lịch sử
  useEffect(() => {
    if (!orderId || !isOpen) return;
    setAllMessages([]); // Reset khi mở lại chat
    axios.get(`/chat/history?orderId=${orderId}`).then(res => {
      const data = res.data as any;
      if (data.success) {
        const dbMsgs = data.messages.map((msg: any) => ({
          ...msg,
          id: msg._id || msg.id || Date.now().toString(),
          time: msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }));
        setAllMessages(dbMsgs);
        setMessages(dbMsgs);
      }
    });
  }, [orderId, isOpen]);

  // Lắng nghe socket chỉ 1 lần cho mỗi orderId
  useEffect(() => {
    if (!orderId) return;
    const roomId = normalizeOrderId(orderId);
    socket.emit('join_order_room', roomId);
    const handler = (msg: any) => {
      if (normalizeOrderId(msg.orderId) !== roomId) return;
      const msgId = msg._id || msg.id || Date.now().toString();
      setAllMessages(prev => {
        if (prev.some(m => m.id === msgId)) return prev;
        return [...prev, {
          ...msg,
          id: msgId,
          time: msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }];
      });
      if (msg.sender !== 'user') toast.info('Bạn có tin nhắn mới từ shipper!');
    };
    socket.on('chat_message', handler);
    return () => { socket.off('chat_message', handler); };
  }, [orderId]);

  // Khi allMessages thay đổi và popup mở, đồng bộ ra messages để render
  useEffect(() => {
    if (isOpen) setMessages(allMessages);
  }, [allMessages, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!message.trim() && !imagePreview) return;
    if (!orderId) {
      toast.error('Không tìm thấy mã đơn hàng!');
      return;
    }
    let msg: any = {
      sender: 'user',
      content: message.trim(),
      type: 'text',
      orderId
    };
    if (imagePreview) {
      const formData = new FormData();
      formData.append('file', dataURLtoFile(imagePreview, 'image.png'));
      const res = await axios.post(UPLOAD_ENDPOINT, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      msg.type = 'image';
      msg.fileUrl = (res.data as any).url;
      msg.content = '';
    }
    try {
      await axios.post('/chat/message', msg);
    setMessage('');
      setImagePreview(null);
      setShowEmoji(false);
      toast.success('Đã gửi tin nhắn!');
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại!');
    }
  };

  // Helper: convert dataURL to File
  function dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(','), match = arr[0].match(/:(.*?);/), mime = match ? match[1] : 'application/octet-stream', bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  const handleCapturePhoto = () => {
    fileInputRef.current?.click();
  };
  // Emoji chọn
  const handleEmojiSelect = (emoji: any) => {
    setMessage(msg => msg + (emoji.native || emoji.emoji || ''));
    setShowEmoji(false);
  };
  // Toggle ghi âm
  const handleRecordClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };
  // Ghi âm
  const handleStartRecording = async () => {
    setIsRecording(true);
    audioChunks.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = e => audioChunks.current.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
      setAudioUrl(URL.createObjectURL(blob));
      setIsRecording(false);
    };
    mediaRecorder.start();
  };
  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };
  // Gửi audio
  const handleSendAudio = async () => {
    if (!audioUrl) return;
    // Upload audioUrl (blob local) lên server
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    try {
      const res = await axios.post(UPLOAD_ENDPOINT, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fileUrl = (res.data as any).url;
      await axios.post('/chat/message', {
        orderId,
        sender: 'user',
        type: 'audio',
        fileUrl
      });
      setAudioUrl(null);
      toast.success('Đã gửi ghi âm!');
    } catch (error) {
      console.error('Lỗi upload audio:', error);
      toast.error('Không gửi được ghi âm!');
    }
  };
  // Hủy audio
  const handleCancelAudio = () => {
    setAudioUrl(null);
  };

  // Khi bắt đầu call (caller hoặc callee)
  const startVideoCall = async () => {
    if (!orderId) {
      toast.error('Không tìm thấy mã đơn hàng!');
      return;
    }
    setIsCalling(true);
    setCallBusy(false);
    setCallStartTime(Date.now());
    setCallEndMessage(null);
    console.log('Gọi video với orderId:', orderId);
    socket.emit('video_call_request', { orderId });
  };

  // Nhận các sự kiện signaling
  useEffect(() => {
    if (!orderId) return;
    // Nhận yêu cầu gọi đến
    socket.on('video_call_request', ({ from }) => {
      setIsReceivingCall(true);
      setCallBusy(false);
    });
    // Nhận trạng thái busy
    socket.on('video_call_busy', () => {
      setCallBusy(true);
      setIsCalling(false);
      setIsReceivingCall(false);
      setIsVideoCallOpen(false);
    });
    // Nhận bị từ chối
    socket.on('video_call_reject', () => {
      setIsCalling(false);
      setIsReceivingCall(false);
      setIsVideoCallOpen(false);
      toast.error('Đối phương đã từ chối cuộc gọi!');
    });
    // Nhận chấp nhận
    socket.on('video_call_accept', async () => {
      setIsCalling(false);
      setIsVideoCallOpen(true);
      await createAndSendOffer();
    });
    // Nhận offer/answer/candidate
    socket.on('video_offer', async ({ offer }) => {
      await handleReceiveOffer(offer);
    });
    socket.on('video_answer', async ({ answer }) => {
      await handleReceiveAnswer(answer);
    });
    socket.on('video_ice_candidate', async ({ candidate }) => {
      await handleReceiveCandidate(candidate);
    });
    return () => {
      socket.off('video_call_request');
      socket.off('video_call_busy');
      socket.off('video_call_reject');
      socket.off('video_call_accept');
      socket.off('video_offer');
      socket.off('video_answer');
      socket.off('video_ice_candidate');
    };
  }, [orderId]);

  // Lắng nghe sự kiện kết thúc call từ socket
  useEffect(() => {
    if (!orderId) return;
    const handleCallEnd = (data: any) => {
      // Tính thời gian call
      let msg = 'Cuộc gọi đã kết thúc';
      if (callStartTime) {
        const duration = Math.floor((Date.now() - callStartTime) / 1000);
        const min = Math.floor(duration / 60);
        const sec = duration % 60;
        msg = `Cuộc gọi đã kết thúc: ${min} phút ${sec} giây`;
      }
      setCallEndMessage(msg);
      setIsVideoCallOpen(false);
      setIsCalling(false);
      setIsReceivingCall(false);
      peerRef.current?.close();
      peerRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setCallStartTime(null);
      toast.info(msg);
    };
    socket.on('video_call_end', handleCallEnd);
    return () => { socket.off('video_call_end', handleCallEnd); };
  }, [orderId, callStartTime]);

  // Chấp nhận cuộc gọi
  const acceptVideoCall = async () => {
    setIsReceivingCall(false);
    setIsVideoCallOpen(true);
    setCallStartTime(Date.now());
    setCallEndMessage(null);
    socket.emit('video_call_accept', { orderId });
    await createPeerConnection();
  };
  // Từ chối cuộc gọi
  const rejectVideoCall = () => {
    setIsReceivingCall(false);
    setIsVideoCallOpen(false);
    socket.emit('video_call_reject', { orderId });
  };
  // Nếu đang bận
  const sendBusy = () => {
    socket.emit('video_call_busy', { orderId });
    setIsReceivingCall(false);
    setIsCalling(false);
    setIsVideoCallOpen(false);
  };

  // Tạo peer connection với STUN server
  const createPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerRef.current = pc;
    // Thử lấy Full HD, nếu lỗi thì fallback về HD
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 1280, ideal: 1920, max: 1920 },
          height: { min: 720, ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: true
      });
    } catch (err) {
      console.warn('Không lấy được Full HD, fallback về HD:', err);
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
    }
    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('video_ice_candidate', { orderId, candidate: e.candidate });
      }
    };
    return pc;
  };

  // Caller tạo offer
  const createAndSendOffer = async () => {
    const pc = await createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('video_offer', { orderId, offer });
  };
  // Callee nhận offer
  const handleReceiveOffer = async (offer: any) => {
    const pc = await createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('video_answer', { orderId, answer });
  };
  // Caller nhận answer
  const handleReceiveAnswer = async (answer: any) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };
  // Nhận ICE candidate
  const handleReceiveCandidate = async (candidate: any) => {
    if (peerRef.current) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  };
  // Kết thúc cuộc gọi
  const endVideoCall = async () => {
    let msg = '';
    let duration = 0;
    if (callStartTime) {
      duration = Math.floor((Date.now() - callStartTime) / 1000);
      const min = Math.floor(duration / 60);
      const sec = duration % 60;
      msg = `Cuộc gọi đã kết thúc: ${min} phút ${sec} giây`;
      setCallEndMessage(msg);
      toast.info(msg);
    }
    socket.emit('video_call_end', { orderId });
    setIsVideoCallOpen(false);
    setIsCalling(false);
    setIsReceivingCall(false);
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStartTime(null);
    // Gửi message vào chat cho cả 2 phía
    if (orderId && msg) {
      await axios.post('/chat/message', {
        orderId,
        sender: 'user', // hoặc lấy từ context nếu cần
        type: 'call_end',
        content: msg,
        duration
      });
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-xl shadow-xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={shipper.avatar} alt={shipper.name} className="w-10 h-10 rounded-full" />
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${shipper.status === 'online' ? 'bg-green-500' : shipper.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'}`} />
            </div>
            <div>
              <h3 className="font-medium">{shipper.name}</h3>
              <span className="text-sm text-green-500">
                {shipper.status === 'online' ? 'Đang hoạt động' : shipper.status === 'busy' ? 'Đang bận' : 'Không hoạt động'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {/* Messages */}
        <div className="h-[420px] overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'shipper' && <img src={shipper.avatar} alt="" className="w-8 h-8 rounded-full mr-2" />}
              <div className={`max-w-[70%] rounded-lg p-3 ${msg.sender === 'user' ? 'bg-orange-500 text-white' : 'bg-white border'}`}>
                {/* Nếu là tin nhắn kết thúc call */}
                {msg.type === 'call_end' ? (
                  <div className="flex flex-col items-start gap-2">
                    <span>{msg.content}</span>
                    <button
                      className="mt-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={startVideoCall}
                    >
                      Gọi lại
                    </button>
                  </div>
                ) : (
                  <>
                    {msg.type === 'image' && msg.fileUrl && (
                      <img
                        src={`${API_URL}/uploads/${msg.fileUrl.split('/uploads/')[1]}`}
                        alt="img"
                        className="max-w-[200px] max-h-[200px] rounded mb-2"
                      />
                    )}
                    {msg.type === 'audio' && msg.fileUrl && (
                      <audio
                        controls
                        src={`${API_URL}/uploads/${msg.fileUrl.split('/uploads/')[1]}`}
                        style={{ width: 220 }}
                      />
                    )}
                <p>{msg.content}</p>
                  </>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs opacity-70">{msg.time}</span>
                  {msg.sender === 'user' && <span className="text-xs opacity-70">
                      {msg.status === 'read' ? '✓✓' : '✓'}
                    </span>}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {/* Input */}
        <div className="p-4 border-t bg-white">
          {imagePreview && (
            <div className="mb-2 flex items-center gap-2">
              <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded" />
              <button onClick={() => setImagePreview(null)} className="text-red-500">X</button>
            </div>
          )}
          {audioUrl && (
            <div className="mb-2 flex items-center gap-2">
              <audio controls src={audioUrl} />
              <button onClick={handleSendAudio} className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Gửi</button>
              <button onClick={handleCancelAudio} className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Hủy</button>
            </div>
          )}
          <div className="flex items-center gap-2 relative">
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageChange} />
            <button className="p-2 hover:bg-gray-100 rounded-full" onClick={handleCapturePhoto} title="Gửi ảnh/chụp ảnh">
              <ImageIcon className="h-5 w-5 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full" onClick={() => setShowEmoji(v => !v)} title="Gửi icon">
              <SmileIcon className="h-5 w-5 text-gray-500" />
            </button>
            {/* Emoji picker: đặt sát input, bên phải */}
            {showEmoji && (
              <div style={{ position: 'absolute', bottom: '48px', right: 0, zIndex: 100 }}>
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setMessage(msg => msg + (emojiData.emoji || ''));
                    setShowEmoji(false);
                  }}
                  autoFocusSearch={false}
                />
              </div>
            )}
            <button
              className={`p-2 hover:bg-gray-100 rounded-full ${isRecording ? 'bg-orange-100' : ''}`}
              onClick={handleRecordClick}
              title={isRecording ? 'Dừng ghi âm & gửi' : 'Bắt đầu ghi âm'}
            >
              <MicIcon className="h-5 w-5 text-gray-500" />
            </button>
            {isRecording && <span className="ml-2 text-orange-500 font-semibold">Đang ghi âm...</span>}
            <button className="p-2 hover:bg-gray-100 rounded-full" onClick={startVideoCall} title="Gọi video">
              <VideoIcon className="h-5 w-5 text-gray-500" />
            </button>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onKeyPress={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Popup nhận cuộc gọi */}
      {isReceivingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl relative min-w-[320px]">
            <img src={shipper.avatar} alt={shipper.name} className="w-20 h-20 rounded-full border-4 border-green-400 shadow-lg" />
            <div className="text-xl font-bold">{shipper.name}</div>
            <div className="text-gray-500 mb-2">Đang gọi video đến bạn...</div>
            <div className="flex gap-6 mt-2">
              <button onClick={acceptVideoCall} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl shadow-lg hover:bg-green-600 transition">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3.5l3 3v-9l-3 3Z"/></svg>
              </button>
              <button onClick={rejectVideoCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl shadow-lg hover:bg-red-600 transition">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6.225 4.811a1 1 0 0 1 1.414 0l11.55 11.55a1 1 0 0 1-1.414 1.415l-11.55-11.55a1 1 0 0 1 0-1.415Z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal video call */}
      {isVideoCallOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="relative w-full max-w-2xl h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
            {/* Video đối phương lớn */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover bg-black"
              style={{ zIndex: 1 }}
            />
            {/* Video mình nhỏ góc phải dưới */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-6 right-6 w-40 h-32 object-cover rounded-xl border-2 border-white shadow-lg"
              style={{ zIndex: 2 }}
            />
            {/* Nút kết thúc call */}
            <button
              onClick={endVideoCall}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl shadow-lg hover:bg-red-600 transition z-10 border-4 border-white"
              title="Kết thúc cuộc gọi"
            >
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6.225 4.811a1 1 0 0 1 1.414 0l11.55 11.55a1 1 0 0 1-1.414 1.415l-11.55-11.55a1 1 0 0 1 0-1.415Z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShipperChat;