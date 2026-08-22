/**
 * CreateDonationPage — Donor surplus food listing form.
 * Cloudhub style: Numbered section cards (01/02/03), crisp light theme, sticky preview.
 */
import { useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { donationService } from '../services/donationService';
import { geoService } from '../services/geoService';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Send,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Boxes,
  Sparkles,
} from 'lucide-react';

const QUANTITY_UNITS  = ['PACKET', 'KG', 'GRAM', 'LITRE', 'ML', 'BOX', 'PLATE'];
const ITEM_CATEGORIES = ['RICE', 'CURRY', 'BREAD', 'VEGETABLE', 'FRUIT', 'SNACK', 'DESSERT', 'BEVERAGE', 'OTHER'];

const toLocalDatetimeString = (date = new Date()) => {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const Label = ({ children, required }) => (
  <label className="block text-xs font-bold text-slate-700 mb-1.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const SectionHeader = ({ title, number }) => (
  <div className="fb-section-card-header bg-slate-50/60">
    {number && (
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 bg-orange-100 text-[#FF553E] border border-orange-200"
      >
        {number}
      </div>
    )}
    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h2>
  </div>
);

// ─── Live preview ─────────────────────────────────────────────────────────────

const LivePreview = ({ formData, items }) => {
  const hasTitle = !!formData.donation_title?.trim();
  const city = formData.pickup_city || (formData.pickup_address?.split(',')[0]) || null;
  const unit = (formData.quantity_unit || '').toLowerCase();
  const qty  = formData.total_quantity ? `${formData.total_quantity} ${unit}`.trim() : null;

  const formatDT = (v) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fb-section-card overflow-hidden sticky top-6 bg-white border border-slate-200 shadow-md">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Preview</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Updates in real-time</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          Draft
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className={`text-base font-bold leading-snug ${hasTitle ? 'text-slate-900' : 'text-slate-400'}`}>
            {hasTitle ? formData.donation_title : 'Donation title will appear here'}
          </h3>
          {formData.description && (
            <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{formData.description}</p>
          )}
        </div>

        <div className="space-y-2 text-xs text-slate-600 font-medium">
          {qty && (
            <div className="flex items-center space-x-2">
              <Boxes size={14} className="text-[#FF553E] shrink-0" />
              <span>{qty}</span>
            </div>
          )}
          {city && (
            <div className="flex items-center space-x-2">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span>{city}</span>
            </div>
          )}
          {formData.available_from && (
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span>From {formatDT(formData.available_from)}</span>
            </div>
          )}
          {formData.expiry_time && (
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span>Expires {formatDT(formData.expiry_time)}</span>
            </div>
          )}
        </div>

        {items.filter(i => i.item_name?.trim()).length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Food Items Manifest</p>
            <div className="space-y-1.5">
              {items.filter(i => i.item_name?.trim()).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                  <span className="truncate font-medium">{item.item_name}</span>
                  {item.quantity && (
                    <span className="tabular-nums ml-2 text-slate-500 font-semibold shrink-0">
                      {item.quantity} {(item.unit || '').toLowerCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CreateDonationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [timeError, setTimeError] = useState(null);

  const [locationStatus,  setLocationStatus]  = useState('idle');
  const [locationMessage, setLocationMessage] = useState(null);
  const [locationSummary, setLocationSummary] = useState(null);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false);

  const availableFromRef = useRef(null);
  const expiryTimeRef    = useRef(null);
  const minDT = useMemo(() => toLocalDatetimeString(new Date()), []);

  const [formData, setFormData] = useState({
    donation_title: '',
    description: '',
    available_from: '',
    expiry_time: '',
    total_quantity: '',
    quantity_unit: 'PACKET',
    pickup_address: '',
    pickup_city: '',
    pickup_state: '',
    pickup_postal_code: '',
    pickup_latitude: '',
    pickup_longitude: '',
    delivery_preference: 'PICKUP_REQUIRED',
    special_instructions: '',
  });

  const [items, setItems] = useState([{
    item_name: '', category: 'RICE', quantity: '', unit: 'PACKET', food_type: 'VEGETARIAN', contains_allergens: false,
  }]);

  const triggerPicker = (ref) => {
    if (ref?.current) {
      if (typeof ref.current.showPicker === 'function') {
        try { ref.current.showPicker(); return; } catch { /* fallback */ }
      }
      ref.current.focus();
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'available_from' && next.expiry_time && new Date(next.expiry_time) <= new Date(value)) {
        setTimeError('Expiry must be after available time.');
      } else if (name === 'expiry_time' && next.available_from && new Date(value) <= new Date(next.available_from)) {
        setTimeError('Expiry must be after available time.');
      } else {
        setTimeError(null);
      }
      return next;
    });
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () => setItems(prev => [...prev, {
    item_name: '', category: 'RICE', quantity: '', unit: formData.quantity_unit || 'PACKET',
    food_type: 'VEGETARIAN', contains_allergens: false,
  }]);

  const removeItem = (i) => { if (items.length > 1) setItems(prev => prev.filter((_, idx) => idx !== i)); };

  const handleDetectLocation = async () => {
    setLocationStatus('loading');
    setLocationMessage(null);
    setLocationSummary(null);
    try {
      const coords = await geoService.getCurrentCoordinates();
      const latStr = coords.latitude.toFixed(6);
      const lonStr = coords.longitude.toFixed(6);
      setFormData(prev => ({ ...prev, pickup_latitude: latStr, pickup_longitude: lonStr }));

      const geo = await geoService.reverseGeocode(coords.latitude, coords.longitude);
      if (geo) {
        setFormData(prev => ({
          ...prev,
          pickup_address:     geo.street      || prev.pickup_address,
          pickup_city:        geo.city        || prev.pickup_city,
          pickup_state:       geo.state       || prev.pickup_state,
          pickup_postal_code: geo.postalCode  || prev.pickup_postal_code,
        }));
        setLocationSummary({
          display: [geo.city, geo.state].filter(Boolean).join(', ') || 'Address located',
          coords:  `${latStr}, ${lonStr}`,
        });
      } else {
        setLocationSummary({ display: 'Coordinates detected', coords: `${latStr}, ${lonStr}` });
      }
      setLocationStatus('success');
    } catch (err) {
      setLocationStatus('error');
      setLocationMessage(err.message || 'Could not detect location. Enter address manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.available_from || !formData.expiry_time) {
      setError('Please provide both Available From and Expiry Time.'); return;
    }
    if (new Date(formData.expiry_time) <= new Date(formData.available_from)) {
      setError('Expiry time must be after Available From.'); return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      ...formData,
      available_from: new Date(formData.available_from).toISOString(),
      expiry_time:    new Date(formData.expiry_time).toISOString(),
      total_quantity: parseFloat(formData.total_quantity).toFixed(2),
      pickup_latitude:  parseFloat(formData.pickup_latitude),
      pickup_longitude: parseFloat(formData.pickup_longitude),
      items: items.map(item => ({
        ...item,
        unit:     item.unit || formData.quantity_unit || 'PACKET',
        quantity: parseFloat(item.quantity).toFixed(2),
      })),
    };
    try {
      const response = await donationService.createDonation(payload);
      if (response.success && response.data) navigate(`/donor/donations/${response.data.donation_id}`);
    } catch (err) {
      setError(err.message || 'Failed to create donation offer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <Link to="/donor" className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition font-semibold">
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </Link>

      {/* Cloudhub Hero Banner */}
      <div className="fb-page-header fb-hero-donor">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1 text-[#FF553E] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Listing Wizard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Post Surplus Food</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Saved as draft — submit to start automated matching with nearby accredited NGOs.
          </p>
        </div>
      </div>

      {error && (
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two-column layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* Form area */}
        <div className="space-y-5">

          {/* Section 1: Overview */}
          <div className="fb-section-card bg-white">
            <SectionHeader title="Donation Overview" number="01" />
            <div className="p-6 space-y-4">

              <div>
                <Label required>Title</Label>
                <input name="donation_title" value={formData.donation_title} onChange={handleInput}
                  placeholder="e.g. Surplus Lunch Buffet Meal Packs" required
                  className="fb-input" />
              </div>

              <div>
                <Label>Description</Label>
                <textarea name="description" value={formData.description} onChange={handleInput}
                  placeholder="e.g. Freshly prepared meal packs from catering event, packed hygienically."
                  rows={2} className="fb-input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Total Quantity</Label>
                  <input type="number" name="total_quantity" value={formData.total_quantity} onChange={handleInput}
                    placeholder="e.g. 50" min="0.1" step="any" required className="fb-input" />
                </div>
                <div>
                  <Label required>Unit</Label>
                  <select name="quantity_unit" value={formData.quantity_unit} onChange={handleInput} className="fb-input font-medium">
                    {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label required>Available From</Label>
                  <input ref={availableFromRef} id="available_from_input"
                    type="datetime-local" name="available_from"
                    value={formData.available_from} onChange={handleInput}
                    onClick={() => triggerPicker(availableFromRef)}
                    min={minDT} required
                    className="fb-input cursor-pointer" />
                  <p className="text-[10px] text-slate-400 mt-1">Start of pickup availability</p>
                </div>
                <div>
                  <Label required>Expiry Time</Label>
                  <input ref={expiryTimeRef} id="expiry_time_input"
                    type="datetime-local" name="expiry_time"
                    value={formData.expiry_time} onChange={handleInput}
                    onClick={() => triggerPicker(expiryTimeRef)}
                    min={formData.available_from || minDT} required
                    className={`fb-input cursor-pointer ${timeError ? '!border-red-500' : ''}`} />
                  {timeError
                    ? <p className="text-[10px] text-red-600 mt-1 flex items-center space-x-1 font-semibold"><AlertCircle size={11} /><span>{timeError}</span></p>
                    : <p className="text-[10px] text-slate-400 mt-1">Must be after Available From</p>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Food Items */}
          <div className="fb-section-card bg-white">
            <div className="flex items-center justify-between">
              <SectionHeader title={`Food Items (${items.length})`} number="02" />
              <button type="button" onClick={addItem}
                className="mr-5 text-xs text-[#FF553E] hover:text-[#E02E14] font-bold flex items-center space-x-1 transition">
                <Plus size={14} />
                <span>Add item</span>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Item Name *</label>
                    <input type="text" value={item.item_name}
                      onChange={e => handleItemChange(idx, 'item_name', e.target.value)}
                      placeholder="e.g. Vegetable Biryani" required
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:border-[#FF553E] focus:outline-none placeholder:text-slate-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Category</label>
                    <select value={item.category} onChange={e => handleItemChange(idx, 'category', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:border-[#FF553E] focus:outline-none font-medium">
                      {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Quantity *</label>
                    <div className="flex space-x-1">
                      <input type="number" value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty" min="0.1" step="any" required
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:border-[#FF553E] focus:outline-none placeholder:text-slate-400 font-semibold" />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Pickup Location */}
          <div className="fb-section-card bg-white">
            <div className="flex items-center justify-between">
              <SectionHeader title="Pickup Location" number="03" />
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Coordinates are used by the Decision Engine to rank NGOs by proximity.
                </p>

                {/* Location detection CTA */}
                <button type="button" id="use-my-location-btn"
                  onClick={handleDetectLocation}
                  disabled={locationStatus === 'loading'}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-2 transition border shrink-0 ${
                    locationStatus === 'loading'  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-wait'
                  : locationStatus === 'success'  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : locationStatus === 'error'    ? 'bg-red-50 border-red-300 text-red-700'
                  : 'fb-btn-primary'
                  }`}>
                  {locationStatus === 'loading'  && <><Loader2 size={12} className="animate-spin" /><span>Detecting…</span></>}
                  {locationStatus === 'success'  && <><CheckCircle2 size={12} /><span>Location detected</span></>}
                  {locationStatus === 'error'    && <><RotateCcw size={12} /><span>Retry</span></>}
                  {locationStatus === 'idle'     && <><MapPin size={12} /><span>Use My Location</span></>}
                </button>
              </div>

              {/* Success summary */}
              {locationStatus === 'success' && locationSummary && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>{locationSummary.display}</strong> · {locationSummary.coords}</span>
                  </div>
                  <span className="text-emerald-600 text-[11px] font-semibold hidden sm:inline">Edit below if needed</span>
                </div>
              )}

              {/* Error */}
              {locationStatus === 'error' && locationMessage && (
                <div className="flex items-start space-x-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{locationMessage}</span>
                </div>
              )}

              {/* Address fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <Label required>Street Address</Label>
                  <input type="text" name="pickup_address" value={formData.pickup_address} onChange={handleInput}
                    placeholder="e.g. 100 Jubilee Hills Road 36" required className="fb-input" />
                </div>
                <div>
                  <Label required>City</Label>
                  <input type="text" name="pickup_city" value={formData.pickup_city} onChange={handleInput}
                    placeholder="e.g. Hyderabad" required className="fb-input" />
                </div>
                <div>
                  <Label required>State</Label>
                  <input type="text" name="pickup_state" value={formData.pickup_state} onChange={handleInput}
                    placeholder="e.g. Telangana" required className="fb-input" />
                </div>
                <div>
                  <Label required>Postal Code</Label>
                  <input type="text" name="pickup_postal_code" value={formData.pickup_postal_code} onChange={handleInput}
                    placeholder="e.g. 500033" required className="fb-input" />
                </div>
              </div>

              {/* Advanced coordinates disclosure */}
              <div>
                <button type="button" onClick={() => setShowAdvancedLocation(v => !v)}
                  className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-semibold">
                  {showAdvancedLocation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>Advanced location details (coordinates)</span>
                </button>

                {showAdvancedLocation && (
                  <div className="grid grid-cols-2 gap-3 mt-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <Label required>Latitude</Label>
                      <input type="text" name="pickup_latitude" value={formData.pickup_latitude} onChange={handleInput}
                        placeholder="e.g. 17.4310" required
                        className="fb-input font-mono text-xs" />
                    </div>
                    <div>
                      <Label required>Longitude</Label>
                      <input type="text" name="pickup_longitude" value={formData.pickup_longitude} onChange={handleInput}
                        placeholder="e.g. 78.4070" required
                        className="fb-input font-mono text-xs" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Special Instructions</Label>
                <input type="text" name="special_instructions" value={formData.special_instructions} onChange={handleInput}
                  placeholder="e.g. Collect from service entrance; please bring insulated carriers."
                  className="fb-input" />
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex justify-end pt-2">
            <button type="submit"
              disabled={loading || !!timeError}
              className="fb-btn-primary px-8 py-3 text-sm font-bold shadow-lg">
              <Send size={15} />
              <span>{loading ? 'Creating…' : 'Create Donation Offer'}</span>
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="hidden lg:block">
          <LivePreview formData={formData} items={items} />
        </div>

      </form>
    </div>
  );
};
