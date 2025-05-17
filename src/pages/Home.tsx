import React from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon, PackageIcon, MapPinIcon, ClockIcon, ShieldCheckIcon, PhoneIcon } from 'lucide-react';
const Home = () => {
  return <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <img src="/logo.png" alt="Logo" className="h-8" />
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-orange-500 px-3 py-2">
                Đăng nhập
              </Link>
              <Link to="/register" className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div className="bg-orange-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Giải pháp vận chuyển thông minh cho doanh nghiệp của bạn
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Quản lý đơn hàng, theo dõi vận chuyển và tối ưu chi phí một cách
                hiệu quả
              </p>
              <Link to="/register" className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 inline-flex items-center">
                <TruckIcon className="h-5 w-5 mr-2" />
                Bắt đầu ngay
              </Link>
            </div>
            <div>
              <img src="https://img.freepik.com/free-vector/delivery-service-illustrated_23-2148505081.jpg" alt="Hero" className="w-full rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      </div>
      {/* Features */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tính năng nổi bật
          </h2>
          <div className="grid grid-cols-3 gap-8">
            {[{
            icon: PackageIcon,
            title: 'Quản lý đơn hàng',
            description: 'Theo dõi và quản lý đơn hàng một cách dễ dàng, từ lúc tạo đơn đến khi giao hàng thành công'
          }, {
            icon: MapPinIcon,
            title: 'Theo dõi thời gian thực',
            description: 'Cập nhật vị trí và trạng thái đơn hàng theo thời gian thực'
          }, {
            icon: ClockIcon,
            title: 'Giao hàng nhanh chóng',
            description: 'Tối ưu hóa quy trình giao hàng, đảm bảo thời gian giao hàng nhanh nhất'
          }].map((feature, index) => <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:border-orange-500 transition-colors">
                <feature.icon className="h-10 w-10 text-orange-500 mb-4" />
                <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <img src="/logo.png" alt="Logo" className="h-8 mb-4" />
              <p className="text-gray-600">
                Giải pháp vận chuyển thông minh cho doanh nghiệp của bạn
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">Liên hệ</h4>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  1900 xxxx
                </div>
                <div>support@ship.com.vn</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-4">Chính sách</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Điều khoản sử dụng</li>
                <li>Chính sách bảo mật</li>
                <li>Quy định vận chuyển</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Theo dõi chúng tôi</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-600 hover:text-orange-500">
                  Facebook
                </a>
                <a href="#" className="text-gray-600 hover:text-orange-500">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Home;