import React, { useEffect, useState } from 'react';
import { Package2Icon, TruckIcon, MapPinIcon } from 'lucide-react';

interface Dimensions {
  length: string;
  width: string;
  height: string;
}
interface Package {
  type: string;
  value: string;
  description: string;
  dimensions: Dimensions;
  weight: string;
}
interface Address {
  name: string;
  phone: string;
  address: string;
}
interface Service {
  type: string;
  estimatedTime: string;
  paymentMethod: string;
}
interface OrderFormValues {
  sender: Address;
  receiver: Address;
  package: Package;
  service: Service;
  coupon: string;
}

const defaultOrder: OrderFormValues = {
  sender: { name: '', phone: '', address: '' },
  receiver: { name: '', phone: '', address: '' },
  package: {
    type: '', value: '', description: '',
    dimensions: { length: '', width: '', height: '' },
    weight: ''
  },
  service: { type: '', estimatedTime: '', paymentMethod: '' },
  coupon: '',
};

interface OrderFormProps {
  initialValues?: OrderFormValues;
  onSubmit: (values: OrderFormValues) => void;
  mode?: 'create' | 'edit';
  loading?: boolean;
  saving?: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({ initialValues = defaultOrder, onSubmit, mode = 'create', loading = false, saving = false }) => {
  const [form, setForm] = useState<OrderFormValues>(initialValues);

  useEffect(() => { setForm(initialValues); }, [initialValues]);

  const handleChange = (section: keyof OrderFormValues, field: string, value: string) => {
    setForm(f => {
      const sectionValue = (f[section] ?? {}) as Record<string, any>;
      return {
        ...f,
        [section]: {
          ...sectionValue,
          [field]: value
        }
      };
    });
  };
  const handlePackageDim = (field: keyof Dimensions, value: string) => {
    setForm(f => ({
      ...f,
      package: {
        ...f.package,
        dimensions: {
          ...f.package.dimensions,
          [field]: value
        }
      }
    }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-semibold">{mode === 'edit' ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Package2Icon className="h-5 w-5" /> Thông tin người gửi
          </h3>
          <div className="space-y-3">
            <input type="text" placeholder="Tên người gửi" className="w-full p-2 border rounded" value={form.sender.name} onChange={e => handleChange('sender', 'name', e.target.value)} />
            <input type="text" placeholder="Số điện thoại" className="w-full p-2 border rounded" value={form.sender.phone} onChange={e => handleChange('sender', 'phone', e.target.value)} />
            <textarea placeholder="Địa chỉ lấy hàng" className="w-full p-2 border rounded" rows={3} value={form.sender.address} onChange={e => handleChange('sender', 'address', e.target.value)} />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <TruckIcon className="h-5 w-5" /> Thông tin người nhận
          </h3>
          <div className="space-y-3">
            <input type="text" placeholder="Tên người nhận" className="w-full p-2 border rounded" value={form.receiver.name} onChange={e => handleChange('receiver', 'name', e.target.value)} />
            <input type="text" placeholder="Số điện thoại" className="w-full p-2 border rounded" value={form.receiver.phone} onChange={e => handleChange('receiver', 'phone', e.target.value)} />
            <textarea placeholder="Địa chỉ giao hàng" className="w-full p-2 border rounded" rows={3} value={form.receiver.address} onChange={e => handleChange('receiver', 'address', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <MapPinIcon className="h-5 w-5" /> Thông tin hàng hóa
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Loại hàng hóa" className="p-2 border rounded" value={form.package.type} onChange={e => handleChange('package', 'type', e.target.value)} />
          <input type="number" placeholder="Trọng lượng (kg)" className="p-2 border rounded" value={form.package.weight} onChange={e => handleChange('package', 'weight', e.target.value)} />
          <div className="flex gap-2">
            <input type="number" placeholder="Dài" className="p-2 border rounded w-1/3" value={form.package.dimensions.length} onChange={e => handlePackageDim('length', e.target.value)} />
            <input type="number" placeholder="Rộng" className="p-2 border rounded w-1/3" value={form.package.dimensions.width} onChange={e => handlePackageDim('width', e.target.value)} />
            <input type="number" placeholder="Cao" className="p-2 border rounded w-1/3" value={form.package.dimensions.height} onChange={e => handlePackageDim('height', e.target.value)} />
          </div>
          <input type="text" placeholder="Giá trị hàng" className="p-2 border rounded" value={form.package.value} onChange={e => handleChange('package', 'value', e.target.value)} />
        </div>
        <textarea placeholder="Mô tả hàng hóa" className="w-full p-2 border rounded" rows={2} value={form.package.description} onChange={e => handleChange('package', 'description', e.target.value)} />
        <div className="flex gap-4">
          <select className="flex-1 p-2 border rounded" value={form.service.type} onChange={e => handleChange('service', 'type', e.target.value)}>
            <option value="">Chọn dịch vụ vận chuyển</option>
            <option value="fast">Giao hàng nhanh</option>
            <option value="standard">Giao hàng tiết kiệm</option>
          </select>
          <input type="text" placeholder="Mã giảm giá" className="flex-1 p-2 border rounded" value={form.coupon || ''} onChange={e => setForm(f => ({ ...f, coupon: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600" disabled={saving}>
          {mode === 'edit' ? 'Cập nhật' : 'Tạo đơn hàng'}
        </button>
      </div>
    </form>
  );
};
export default OrderForm;