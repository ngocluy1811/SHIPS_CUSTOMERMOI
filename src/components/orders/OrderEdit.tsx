import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { getProvinces, getDistrictsByProvinceCode, getWardsByDistrictCode } from 'sub-vn';
import { toast } from 'react-toastify';

const paymentMethods = [
  { value: 'COD', label: 'Thanh toán khi nhận hàng' },
  { value: 'MOMO', label: 'Ví MoMo' },
  { value: 'BANK', label: 'Chuyển khoản ngân hàng' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'VNPAY', label: 'VNPay' },
  { value: 'ZALOPAY', label: 'ZaloPay' },
  { value: 'SHOPEEPAY', label: 'ShopeePay' },
  { value: 'VISA', label: 'Thẻ Visa' },
  { value: 'MASTERCARD', label: 'Thẻ Mastercard' },
  { value: 'JCB', label: 'Thẻ JCB' },
  { value: 'AMEX', label: 'Thẻ American Express' },
];

const itemTypes = [
  'Thực phẩm',
  'Quần áo',
  'Điện tử',
  'Hàng dễ vỡ',
  'Hàng cồng kềnh',
  'Khác',
];

const OrderEdit = () => {
  const { order_id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>(null);
  const [originalForm, setOriginalForm] = useState<any>(null);
  const [pickupProvinceCode, setPickupProvinceCode] = useState('');
  const [pickupDistrictCode, setPickupDistrictCode] = useState('');
  const [deliveryProvinceCode, setDeliveryProvinceCode] = useState('');
  const [deliveryDistrictCode, setDeliveryDistrictCode] = useState('');
  const [pickupWardCode, setPickupWardCode] = useState('');
  const [deliveryWardCode, setDeliveryWardCode] = useState('');

  // Lấy danh sách tỉnh/thành phố, quận/huyện, phường/xã từ sub-vn
  const provinces = getProvinces();
  const getDistricts = (provinceCode: string) => getDistrictsByProvinceCode(provinceCode);
  const getWards = (districtCode: string) => getWardsByDistrictCode(districtCode);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/orders/${order_id}`);
        const data = res.data as any;
        let orderItems = data.order_items && data.order_items.length > 0
          ? [{ ...{ item_type: '', description: '', quantity: 1 }, ...data.order_items[0] }]
          : [{ item_type: '', description: '', quantity: 1 }];
        // Chuẩn hóa giá trị item_type về đúng option trong itemTypes
        let itemTypeValue = (typeof data.item_type === 'string' && data.item_type.trim())
          ? data.item_type.trim()
          : (orderItems[0].item_type || '');
        itemTypeValue = itemTypes.find(type => type.trim().toLowerCase() === itemTypeValue.trim().toLowerCase()) || '';
        orderItems[0].item_type = itemTypeValue;
        // Lấy mô tả hàng hóa từ data.order_items[0].description nếu có
        let descriptionValue = '';
        if (data.order_items && data.order_items[0] && typeof data.order_items[0].description === 'string') {
          descriptionValue = data.order_items[0].description;
        }
        orderItems[0].description = descriptionValue;
        setForm({
          ...data,
          order_items: orderItems
        });
        setOriginalForm({
          ...data,
          order_items: orderItems
        });
        // Log để debug
        console.log('DEBUG description from API:', descriptionValue);
      } catch (err: any) {
        setError('Không lấy được thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [order_id]);

  useEffect(() => {
    if (form && form.pickup_address) {
      const province = provinces.find((p: any) => p.name === form.pickup_address.city);
      setPickupProvinceCode(province ? province.code : '');
      const district = province ? getDistricts(province.code).find((d: any) => d.name === form.pickup_address.district) : null;
      setPickupDistrictCode(district ? district.code : '');
      const ward = district ? getWards(district.code).find((w: any) => w.name === form.pickup_address.ward) : null;
      setPickupWardCode(ward ? ward.code : '');
    }
    if (form && form.delivery_address) {
      const province = provinces.find((p: any) => p.name === form.delivery_address.city);
      setDeliveryProvinceCode(province ? province.code : '');
      const district = province ? getDistricts(province.code).find((d: any) => d.name === form.delivery_address.district) : null;
      setDeliveryDistrictCode(district ? district.code : '');
      const ward = district ? getWards(district.code).find((w: any) => w.name === form.delivery_address.ward) : null;
      setDeliveryWardCode(ward ? ward.code : '');
    }
  }, [form]);

  const handleChange = (field: string, value: any) => {
    setForm((f: any) => ({ ...f, [field]: value }));
  };
  const handleAddressChange = (type: 'pickup_address' | 'delivery_address', field: string, value: any) => {
    setForm((f: any) => ({ ...f, [type]: { ...f[type], [field]: value } }));
  };
  const getChangedFields = (original: any, updated: any) => {
    const changed: any = {};
    for (const key in updated) {
      if (typeof updated[key] === 'object' && updated[key] !== null && original[key]) {
        const nested = getChangedFields(original[key], updated[key]);
        if (Object.keys(nested).length > 0) changed[key] = nested;
      } else if (updated[key] !== original[key]) {
        changed[key] = updated[key];
      }
    }
    return changed;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let dataToSend = getChangedFields(originalForm, form);
      // LUÔN gửi đầy đủ order_items[0] (không phụ thuộc vào getChangedFields)
      if (form.order_items && form.order_items[0] && originalForm.order_items && originalForm.order_items[0]) {
        dataToSend.order_items = [
          {
            ...originalForm.order_items[0],
            ...form.order_items[0]
          }
        ];
      }
      if (dataToSend.pickup_time_suggestion && typeof dataToSend.pickup_time_suggestion === 'string' && dataToSend.pickup_time_suggestion.length === 16) {
        dataToSend.pickup_time_suggestion = new Date(dataToSend.pickup_time_suggestion).toISOString();
      }
      if (dataToSend.estimate_time && typeof dataToSend.estimate_time === 'string' && dataToSend.estimate_time.length === 16) {
        dataToSend.estimate_time = new Date(dataToSend.estimate_time).toISOString();
      }
      if (Object.keys(dataToSend).length === 0) {
        alert('Không có thay đổi nào để cập nhật!');
        setSaving(false);
        return;
      }
      // Log để debug
      console.log('DEBUG gửi lên:', JSON.stringify(dataToSend, null, 2));
      await axios.put(`/orders/${order_id}`, dataToSend);
      toast.success('Cập nhật đơn hàng thành công!', { position: 'top-right', autoClose: 2000 });
      navigate(`/orders/${order_id}`);
    } catch (err: any) {
      console.error('Lỗi cập nhật đơn hàng:', err?.response?.data || err);
      setError('Cập nhật thất bại! ' + (err?.response?.data?.error || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!form) return null;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-xl font-bold mb-4">Chỉnh sửa đơn hàng #{order_id}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-medium mb-1">Địa chỉ lấy</div>
            <input className="w-full border rounded p-2 mb-1" value={form.pickup_address?.name || ''} onChange={e => handleAddressChange('pickup_address', 'name', e.target.value)} placeholder="Tên người gửi" />
            <input className="w-full border rounded p-2 mb-1" value={form.pickup_address?.phone || ''} onChange={e => handleAddressChange('pickup_address', 'phone', e.target.value)} placeholder="SĐT người gửi" />
            <input className="w-full border rounded p-2 mb-1" value={form.pickup_address?.street || ''} onChange={e => handleAddressChange('pickup_address', 'street', e.target.value)} placeholder="Số nhà, tên đường" />
            <select className="w-full border rounded p-2 mb-1" value={pickupProvinceCode} onChange={e => {
              setPickupProvinceCode(e.target.value);
              setPickupDistrictCode('');
              setPickupWardCode('');
              const provinceName = provinces.find((p: any) => p.code === e.target.value)?.name || '';
              handleAddressChange('pickup_address', 'city', provinceName);
            }}>
              <option value="">Chọn tỉnh/thành phố</option>
              {provinces.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            <select className="w-full border rounded p-2 mb-1" value={pickupDistrictCode} onChange={e => {
              setPickupDistrictCode(e.target.value);
              setPickupWardCode('');
              const districtName = getDistricts(pickupProvinceCode).find((d: any) => d.code === e.target.value)?.name || '';
              handleAddressChange('pickup_address', 'district', districtName);
            }} disabled={!pickupProvinceCode}>
              <option value="">Chọn quận/huyện</option>
              {getDistricts(pickupProvinceCode).map((d: any) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
            <select className="w-full border rounded p-2 mb-1" value={pickupWardCode} onChange={e => {
              setPickupWardCode(e.target.value);
              const wardName = getWards(pickupDistrictCode).find((w: any) => w.code === e.target.value)?.name || '';
              handleAddressChange('pickup_address', 'ward', wardName);
            }} disabled={!pickupDistrictCode}>
              <option value="">Chọn phường/xã</option>
              {getWards(pickupDistrictCode).map((w: any) => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <div className="font-medium mb-1">Địa chỉ giao</div>
            <input className="w-full border rounded p-2 mb-1" value={form.delivery_address?.name || ''} onChange={e => handleAddressChange('delivery_address', 'name', e.target.value)} placeholder="Tên người nhận" />
            <input className="w-full border rounded p-2 mb-1" value={form.delivery_address?.phone || ''} onChange={e => handleAddressChange('delivery_address', 'phone', e.target.value)} placeholder="SĐT người nhận" />
            <input className="w-full border rounded p-2 mb-1" value={form.delivery_address?.street || ''} onChange={e => handleAddressChange('delivery_address', 'street', e.target.value)} placeholder="Số nhà, tên đường" />
            <select className="w-full border rounded p-2 mb-1" value={deliveryProvinceCode} onChange={e => {
              setDeliveryProvinceCode(e.target.value);
              setDeliveryDistrictCode('');
              setDeliveryWardCode('');
              const provinceName = provinces.find((p: any) => p.code === e.target.value)?.name || '';
              handleAddressChange('delivery_address', 'city', provinceName);
            }}>
              <option value="">Chọn tỉnh/thành phố</option>
              {provinces.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            <select className="w-full border rounded p-2 mb-1" value={deliveryDistrictCode} onChange={e => {
              setDeliveryDistrictCode(e.target.value);
              setDeliveryWardCode('');
              const districtName = getDistricts(deliveryProvinceCode).find((d: any) => d.code === e.target.value)?.name || '';
              handleAddressChange('delivery_address', 'district', districtName);
            }} disabled={!deliveryProvinceCode}>
              <option value="">Chọn quận/huyện</option>
              {getDistricts(deliveryProvinceCode).map((d: any) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
            <select className="w-full border rounded p-2 mb-1" value={deliveryWardCode} onChange={e => {
              setDeliveryWardCode(e.target.value);
              const wardName = getWards(deliveryDistrictCode).find((w: any) => w.code === e.target.value)?.name || '';
              handleAddressChange('delivery_address', 'ward', wardName);
            }} disabled={!deliveryDistrictCode}>
              <option value="">Chọn phường/xã</option>
              {getWards(deliveryDistrictCode).map((w: any) => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Giá trị hàng hóa</label>
            <input type="number" className="w-full border rounded p-2" value={form.order_value !== undefined && form.order_value !== null ? form.order_value : ''} onChange={e => handleChange('order_value', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Phương thức thanh toán</label>
            <select className="w-full border rounded p-2" value={form.payment_method || ''} disabled>
              <option value="">Chọn phương thức</option>
              {paymentMethods.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Trọng lượng (kg)</label>
            <input type="number" className="w-full border rounded p-2" value={form.weight || ''} onChange={e => handleChange('weight', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Kích thước (DxRxC)</label>
            <input className="w-full border rounded p-2" value={form.dimensions || ''} onChange={e => handleChange('dimensions', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Loại hàng hóa</label>
          <select className="w-full border rounded p-2" value={form.order_items?.[0]?.item_type || ''} onChange={e => setForm((f: any) => ({ ...f, order_items: [{ ...f.order_items?.[0], item_type: e.target.value }] }))}>
            <option value="">Chọn loại hàng hóa</option>
            {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Mô tả hàng hóa</label>
          <input className="w-full border rounded p-2" value={form.order_items?.[0]?.description || ''} onChange={e => setForm((f: any) => ({
            ...f,
            order_items: [
              {
                ...((f.order_items && f.order_items[0]) || {}),
                description: e.target.value
              }
            ]
          }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Ngày lấy hàng</label>
            {(() => {
              const pickupTime = form.pickup_time_suggestion || form.pickup_time || form.estimate_time || '';
              let pickupTimeValue = '';
              if (pickupTime) {
                const d = new Date(pickupTime);
                // Chuyển về local timezone nếu cần
                pickupTimeValue = d.toISOString().slice(0, 16);
              }
              return (
                <input
                  type="datetime-local"
                  className="w-full border rounded p-2"
                  value={pickupTimeValue}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => {
                    const val = e.target.value;
                    const now = new Date();
                    now.setSeconds(0, 0);
                    const picked = new Date(val);
                    if (picked < now) {
                      toast.error('Ngày lấy hàng không được nhỏ hơn ngày hiện tại!');
                      handleChange('pickup_time_suggestion', '');
                    } else {
                      handleChange('pickup_time_suggestion', val);
                    }
                  }}
                />
              );
            })()}
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <button type="submit" className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          <button type="button" className="px-6 py-2 border rounded-lg hover:bg-gray-100" onClick={() => navigate(-1)}>Huỷ</button>
        </div>
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </form>
    </div>
  );
};

export default OrderEdit; 