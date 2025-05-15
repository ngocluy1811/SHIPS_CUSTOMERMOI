import React, { useState, useEffect, useRef } from 'react';
import { MessageCircleIcon, PhoneIcon, MailIcon, BookOpenIcon, HelpCircleIcon } from 'lucide-react';
import AIChatBox from '../chat/AIChatBox';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const guides = [
  {
    title: 'Hướng dẫn tạo đơn hàng',
    path: '/orders/new',
    detail: 'Để tạo đơn hàng, bạn vào mục "Tạo đơn vận" ở menu bên trái hoặc nhấn vào đây. Sau đó điền đầy đủ thông tin người gửi, người nhận, địa chỉ, loại hàng, dịch vụ vận chuyển và nhấn "Tạo đơn hàng". Đơn hàng sẽ xuất hiện trong mục "Đơn hàng" để bạn theo dõi.'
  },
  {
    title: 'Cách tính phí vận chuyển',
    path: '/support',
    detail: 'Phí vận chuyển được tính dựa trên trọng lượng, kích thước, khoảng cách và loại dịch vụ bạn chọn. Bạn có thể xem chi tiết phí khi tạo đơn hàng hoặc liên hệ hotline để được tư vấn.'
  },
  {
    title: 'Chính sách đổi trả',
    path: '/support',
    detail: 'Chính sách đổi trả áp dụng cho các trường hợp hàng hóa bị lỗi, hư hỏng do vận chuyển. Vui lòng liên hệ hotline hoặc email để được hỗ trợ đổi trả.'
  },
  {
    title: 'Quy định về hàng hóa cấm gửi',
    path: '/support',
    detail: 'Các mặt hàng cấm gửi bao gồm: chất cấm, vũ khí, động vật sống, hàng dễ cháy nổ, hàng hóa vi phạm pháp luật... Vui lòng tham khảo danh sách chi tiết trên website hoặc liên hệ hỗ trợ.'
  }
];

const VIETMAP_TILE_API_KEY = '7f9ef35866466886ebd24ba5091eda803732c8c76cde1b4a';

const Support = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [modalGuide, setModalGuide] = useState<null | { title: string; detail: string }>(null);
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);

  const handleGuideClick = (guide: typeof guides[0]) => {
    if (guide.path && guide.path !== '/support') {
      navigate(guide.path);
    } else {
      setModalGuide(guide);
    }
  };

  useEffect(() => {
    let map: L.Map | null = null;
    if (mapRef.current && !mapRef.current.hasChildNodes()) {
      map = L.map(mapRef.current).setView([10.762622, 106.660172], 13);
      const tileUrl = `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}@2x.png?apikey=${VIETMAP_TILE_API_KEY}`;
      L.tileLayer(tileUrl, {
        maxZoom: 18,
        attribution: '© VietMap'
      }).addTo(map);
    }
    return () => {
      if (map) map.remove();
    };
  }, []);

  return <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Hỗ trợ</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <MessageCircleIcon className="h-5 w-5 text-orange-500" />
            Liên hệ hỗ trợ
          </h2>
          <div className="space-y-4">
            <button onClick={() => setIsChatOpen(true)} className="w-full p-4 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2">
              <MessageCircleIcon className="h-5 w-5" />
              Chat với trợ lý AI
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <PhoneIcon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">Hotline</div>
                <div className="text-orange-500">0326302451</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <MailIcon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">Email</div>
                <div className="text-orange-500">vongocluy12345@gmail.com</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <BookOpenIcon className="h-5 w-5 text-orange-500" />
            Hướng dẫn sử dụng
          </h2>
          <div className="space-y-3">
            {guides.map((guide, index) => (
              <button key={index} className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
                onClick={() => handleGuideClick(guide)}>
                <HelpCircleIcon className="h-4 w-4 text-gray-400" />
                <span>{guide.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="font-medium mb-4">Câu hỏi thường gặp</h2>
        <div className="space-y-4">
          {[{
          q: 'Làm thế nào để theo dõi đơn hàng?',
          a: 'Bạn có thể theo dõi đơn hàng bằng cách nhập mã đơn hàng vào mục Theo dõi đơn hàng trên trang chủ hoặc trong mục Đơn hàng.'
        }, {
          q: 'Thời gian giao hàng mất bao lâu?',
          a: 'Thời gian giao hàng phụ thuộc vào khoảng cách và dịch vụ vận chuyển bạn chọn. Thông thường từ 1-3 ngày đối với nội thành và 3-5 ngày đối với các tỉnh.'
        }, {
          q: 'Làm sao để hủy đơn hàng?',
          a: 'Bạn có thể hủy đơn hàng trong vòng 2 giờ sau khi tạo đơn nếu đơn hàng chưa được xử lý. Vui lòng liên hệ hotline nếu cần hỗ trợ.'
        }].map((item, index) => <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium mb-2">
                <HelpCircleIcon className="h-5 w-5 text-orange-500" />
                {item.q}
              </div>
              <div className="text-gray-600 pl-7">{item.a}</div>
            </div>)}
        </div>
      </div>
      <AIChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      {/* Modal hướng dẫn chi tiết */}
      {modalGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button onClick={() => setModalGuide(null)} className="absolute top-2 right-2 text-gray-400 hover:text-orange-500 text-xl">×</button>
            <h3 className="text-lg font-bold mb-2 text-orange-500">{modalGuide.title}</h3>
            <div className="text-gray-700 whitespace-pre-line">{modalGuide.detail}</div>
          </div>
        </div>
      )}
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Hỗ trợ khách hàng</h2>
        <p className="mb-4">Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi hoặc xem vị trí trên bản đồ dưới đây:</p>
        <div className="w-full h-[500px] rounded-lg overflow-hidden border shadow">
          <div ref={mapRef} id="vietmap" style={{ width: '100%', height: '500px' }}></div>
        </div>
      </div>
    </div>;
};
export default Support;