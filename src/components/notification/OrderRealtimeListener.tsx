import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { socket } from '../../socket';

const OrderRealtimeListener = () => {
  useEffect(() => {
    // Join vào room orders
    socket.emit('join_orders_room');

    // Lắng nghe sự kiện order_claimed
    socket.on('order_claimed', (data) => {
      console.log('Received order_claimed event:', data); // Thêm log để debug
      toast.info(
        <div>
          <b>Đơn hàng {data.orderId}</b> đã được nhận bởi shipper <b>{data.shipperName || 'một shipper'}</b>
        </div>,
        {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    });

    // Lắng nghe sự kiện order_status_updated
    socket.on('order_status_updated', (data) => {
      toast.info(
        <div>
          <b>Đơn hàng {data.order_id}</b> đã được cập nhật trạng thái: <b>{data.status}</b>
        </div>,
        {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
    });

    // Cleanup khi component unmount
    return () => {
      socket.off('order_claimed');
      socket.off('order_status_updated');
    };
  }, []);

  return null;
};

export default OrderRealtimeListener; 