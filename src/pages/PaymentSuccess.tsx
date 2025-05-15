import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  useEffect(() => {
    toast.success('Tạo đơn hàng và thanh toán thành công!');
    // Nếu mở trong popup, gửi message về parent và tự đóng
    if (window.opener) {
      window.opener.postMessage(
        { status: 'success', message: 'Tạo đơn hàng và thanh toán thành công!' },
        '*'
      );
      setTimeout(() => window.close(), 1000);
      return;
    }
    // Nếu không phải popup, chuyển về dashboard sau 2s
    const timer = setTimeout(() => navigate('/dashboard'), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);
  return <div style={{textAlign:'center',marginTop:60,fontSize:22,color:'#16a34a',fontWeight:600}}>
    <div>Thanh toán thành công!</div>
    <div style={{marginTop:16, fontSize:16, color:'#333'}}>Bạn sẽ được chuyển về trang chủ trong giây lát...</div>
  </div>;
} 