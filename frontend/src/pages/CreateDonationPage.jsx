/**
 * CreateDonationPage — Donor surplus food listing form.
 * Cloudhub style: Numbered section cards (01/02/03), crisp light theme, sticky preview.
 */
import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { donationService } from '../services/donationService';
import { geoService } from '../services/geoService';
import {
  TextField,
  TextArea,
  Select,
  NumberField,
  DateTimePicker,
} from '../components/common/forms';
import { Button } from '../components/common/Button';
import { BorderBeam } from '../components/magicui/BorderBeam';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Send,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
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

const SectionHeader = ({ title, number }) => (
  <div className="fb-section-card-header bg-slate-50/60 dark:bg-[#171E27] border-b border-slate-100 dark:border-[#26313D]">
    {number && (
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 bg-orange-100 dark:bg-orange-500/15 text-[#FF5A2F] border border-orange-200 dark:border-orange-500/30"
      >
        {number}
      </div>
    )}
    <h2 className="text-xs font-bold text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider">{title}</h2>
  </div>
);

// ─── Live preview ─────────────────────────────────────────────────────────────

const LivePreview = ({ formData, items }) => {
  const hasTitle = !!formData.donation_title?.trim();
  const city = formData.pickup_city || (formData.pickup_address?.split(',')[0]) || null;
  const unit = (formData.quantity_unit || '').toLowerCase();
  const qty  = formData.total_quantity ? `${formData.total_quantity} ${unit}`.trim() : null;

  const formatDT = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fb-section-card relative overflow-hidden sticky top-6 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-md">
      <BorderBeam duration={8} size={100} colorFrom="#FF5A2F" colorTo="#FFA726" />
      <div className="px-5 py-4 border-b border-slate-100 dark:border-[#26313D] bg-slate-50/70 dark:bg-[#171E27] flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider">Live Preview</p>
          <p className="text-[11px] text-slate-400 dark:text-[#748296] mt-0.5">Updates in real-time</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Draft
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className={`text-base font-bold leading-snug ${hasTitle ? 'text-slate-900 dark:text-[#F5F7FA]' : 'text-slate-400 dark:text-[#748296]'}`}>
            {hasTitle ? formData.donation_title : 'Donation title will appear here'}
          </h3>
          {formData.description && (
            <p className="text-xs text-slate-600 dark:text-[#A5B1C2] mt-1.5 line-clamp-2 leading-relaxed">{formData.description}</p>
          )}
        </div>

        <div className="space-y-2 text-xs text-slate-600 dark:text-[#A5B1C2] font-medium">
          {qty && (
            <div className="flex items-center space-x-2">
              <Boxes size={14} className="text-[#FF5A2F] shrink-0" />
              <span className="text-slate-900 dark:text-[#F5F7FA] font-bold">{qty}</span>
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
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-semibold">
              <Sparkles size={14} className="shrink-0" />
              <span>Expires {formatDT(formData.expiry_time)}</span>
            </div>
          )}
        </div>

        {items.some(i => i.item_name?.trim()) && (
          <div className="border-t border-slate-100 dark:border-[#26313D] pt-3">
            <p className="text-[10px] font-bold text-slate-400 dark:text-[#748296] uppercase tracking-widest mb-2">Food Items Manifest</p>
            <div className="space-y-1.5">
              {items.filter(i => i.item_name?.trim()).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-700 dark:text-[#F5F7FA]">
                  <span className="truncate font-medium">{item.item_name}</span>
                  {item.quantity && (
                    <span className="tabular-nums ml-2 text-slate-500 dark:text-[#A5B1C2] font-semibold shrink-0">
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
    try {
      const coords = await geoService.getCurrentCoordinates();
      const latStr = coords.latitude.toFixed(6);
      const lonStr = coords.longitude.toFixed(6);

      setFormData(prev => ({
        ...prev,
        pickup_latitude: latStr,
        pickup_longitude: lonStr,
      }));

      const geo = await geoService.reverseGeocode(coords.latitude, coords.longitude);
      if (geo) {
        setFormData(prev => ({
          ...prev,
          pickup_address:     geo.street      || prev.pickup_address,
          pickup_city:        geo.city        || prev.pickup_city,
          pickup_state:       geo.state       || prev.pickup_state,
          pickup_postal_code: geo.postalCode  || prev.pickup_postal_code,
        }));
        if (!geo.postalCode) {
          setLocationMessage('PIN code could not be detected. Please enter it manually.');
        }
      } else {
        setLocationMessage('Location detected, but the address could not be determined. Please enter your location manually.');
      }
      setLocationStatus('success');
    } catch (err) {
      setLocationStatus('error');
      setLocationMessage(err.message || 'Unable to determine your location. Please try again.');
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

  const [presetLoaded, setPresetLoaded] = useState(false);

  const loadDemoScenario = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const expiry = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours later

    setFormData({
      donation_title: 'Fresh Veg Biryani Meal Packs',
      description: 'Freshly prepared vegetarian biryani meal packs available for immediate community redistribution.',
      available_from: toLocalDatetimeString(now),
      expiry_time:    toLocalDatetimeString(expiry),
      total_quantity: '50',
      quantity_unit:  'PACKET',
      pickup_address: "Dave's Kitchen, Road No. 12, Banjara Hills, Hyderabad",
      pickup_city:    'Hyderabad',
      pickup_state:   'Telangana',
      pickup_postal_code: '500034',
      pickup_latitude:  '17.412600',
      pickup_longitude: '78.407100',
      delivery_preference: 'PICKUP_REQUIRED',
      special_instructions: 'Freshly packed in individual thermal meal containers. Ready for immediate pickup.',
    });

    setItems([{
      item_name: 'Fresh Veg Biryani Meal Packs',
      category: 'RICE',
      quantity: '50',
      unit: 'PACKET',
      food_type: 'VEGETARIAN',
      contains_allergens: false,
    }]);

    setTimeError(null);
    setError(null);
    setLocationStatus('success');
    setLocationMessage(null);

    setPresetLoaded(true);
    setTimeout(() => {
      setPresetLoaded(false);
    }, 3500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <Link to="/donor" className="inline-flex items-center space-x-1.5 text-xs text-slate-500 dark:text-[#A5B1C2] hover:text-slate-900 dark:hover:text-[#F5F7FA] transition font-semibold">
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </Link>

      {/* Cloudhub Hero Banner */}
      <div className="fb-page-header fb-hero-donor">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-1 text-[#FF5A2F] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Listing Wizard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight">Post Surplus Food</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A5B1C2] mt-1 font-medium">
            Saved as draft — submit to start automated matching with nearby accredited NGOs.
          </p>
        </div>
      </div>

      {/* Demo Scenario Preset Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/15 dark:via-amber-500/10 dark:to-[#11171F] border border-orange-200 dark:border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-500/20 text-[#FF5A2F] border border-orange-200 dark:border-orange-500/30">
              <Sparkles size={11} className="shrink-0" />
              <span>DEMO SCENARIO</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F5F7FA] flex items-center gap-1.5">
              <span>Dave&apos;s Kitchen</span>
              <span className="text-orange-500 font-semibold text-xs">→</span>
              <span>50 Fresh Veg Biryani Meal Packs</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#A5B1C2] font-medium">
              Pre-fills a realistic donation for demonstrating FoodBridge&apos;s real Decision &amp; Matching Engine.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {presetLoaded && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1.5 rounded-xl animate-fade-in">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>Demo scenario loaded</span>
              </span>
            )}
            <Button
              id="load-demo-scenario-btn"
              type="button"
              variant={presetLoaded ? "secondary" : "primary"}
              size="md"
              icon={presetLoaded ? CheckCircle2 : Sparkles}
              onClick={loadDemoScenario}
              className="font-bold shadow-sm"
            >
              {presetLoaded ? "Reload Demo Scenario" : "Fill Demo Scenario"}
            </Button>
          </div>
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
          <div className="fb-section-card relative z-20 overflow-visible">
            <SectionHeader title="Donation Overview" number="01" />
            <div className="p-6 space-y-4">
              <TextField
                label="Title"
                name="donation_title"
                value={formData.donation_title}
                onChange={handleInput}
                placeholder="e.g. Surplus Lunch Buffet Meal Packs"
                required
              />

              <TextArea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInput}
                placeholder="e.g. Freshly prepared meal packs from catering event, packed hygienically."
                rows={2}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label="Total Quantity"
                  name="total_quantity"
                  value={formData.total_quantity}
                  onChange={handleInput}
                  placeholder="e.g. 50"
                  min="1"
                  step="1"
                  required
                />
                <Select
                  label="Unit"
                  name="quantity_unit"
                  value={formData.quantity_unit}
                  onChange={handleInput}
                  options={QUANTITY_UNITS}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateTimePicker
                  id="available_from_input"
                  name="available_from"
                  label="Available From"
                  value={formData.available_from}
                  onChange={handleInput}
                  minDateTime={minDT}
                  required
                  helperText="Start of pickup availability"
                />
                <DateTimePicker
                  id="expiry_time_input"
                  name="expiry_time"
                  label="Expiry Time"
                  value={formData.expiry_time}
                  onChange={handleInput}
                  minDateTime={formData.available_from || minDT}
                  required
                  error={timeError}
                  helperText={!timeError ? "Must be after Available From" : undefined}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Food Items */}
          <div className="fb-section-card">
            <div className="flex items-center justify-between">
              <SectionHeader title={`Food Items (${items.length})`} number="02" />
              <Button
                type="button"
                onClick={addItem}
                variant="secondary"
                size="sm"
                icon={Plus}
                className="mr-5"
              >
                Add item
              </Button>
            </div>
            <div className="px-6 pb-6 space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50/80 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                  <div className="sm:col-span-2">
                    <TextField
                      label="Item Name"
                      value={item.item_name}
                      onChange={e => handleItemChange(idx, 'item_name', e.target.value)}
                      placeholder="e.g. Vegetable Biryani"
                      required
                    />
                  </div>
                  <div>
                    <Select
                      label="Category"
                      value={item.category}
                      onChange={e => handleItemChange(idx, 'category', e.target.value)}
                      options={ITEM_CATEGORIES}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#F5F7FA] mb-1.5 select-none">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-1">
                      <NumberField
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        min="1"
                        step="1"
                        required
                        className="flex-1 min-w-0"
                      />
                      {items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(idx)}
                          variant="danger"
                          size="md"
                          icon={Trash2}
                          aria-label="Remove item"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Pickup Location */}
          <div className="fb-section-card">
            <div className="flex items-center justify-between">
              <SectionHeader title="Pickup Location" number="03" />
              <Button
                type="button"
                id="use-my-location-btn"
                onClick={handleDetectLocation}
                disabled={locationStatus === 'loading'}
                loading={locationStatus === 'loading'}
                loadingText="Detecting location…"
                variant={
                  locationStatus === 'success'
                    ? 'success'
                    : locationStatus === 'error'
                    ? 'danger'
                    : 'secondary'
                }
                size="sm"
                icon={
                  locationStatus === 'success'
                    ? CheckCircle2
                    : locationStatus === 'error'
                    ? RotateCcw
                    : MapPin
                }
                className="mr-5 shrink-0"
              >
                {locationStatus === 'success'
                  ? 'Location detected'
                  : locationStatus === 'error'
                  ? 'Retry'
                  : 'Use My Location'}
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Notice / Error message */}
              {locationMessage && (
                <div
                  className={`flex items-start space-x-2 px-3.5 py-2.5 rounded-xl text-xs ${
                    locationStatus === 'error'
                      ? 'bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
                      : 'bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-400'
                  }`}
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{locationMessage}</span>
                </div>
              )}

              {/* Address / Area */}
              <TextField
                label="Address / Area"
                name="pickup_address"
                value={formData.pickup_address}
                onChange={handleInput}
                placeholder="e.g. 100 Jubilee Hills Road 36"
                required
              />

              {/* City, State, PIN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextField
                  label="City"
                  name="pickup_city"
                  value={formData.pickup_city}
                  onChange={handleInput}
                  placeholder="e.g. Hyderabad"
                  required
                />
                <TextField
                  label="State"
                  name="pickup_state"
                  value={formData.pickup_state}
                  onChange={handleInput}
                  placeholder="e.g. Telangana"
                  required
                />
                <TextField
                  label="PIN Code"
                  name="pickup_postal_code"
                  value={formData.pickup_postal_code}
                  onChange={handleInput}
                  placeholder="e.g. 500033"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  inputClassName="font-mono"
                />
              </div>

              {/* Latitude and Longitude directly visible */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label="Latitude"
                  name="pickup_latitude"
                  value={formData.pickup_latitude}
                  onChange={handleInput}
                  placeholder="e.g. 17.431000"
                  required
                  inputClassName="font-mono text-xs"
                />
                <TextField
                  label="Longitude"
                  name="pickup_longitude"
                  value={formData.pickup_longitude}
                  onChange={handleInput}
                  placeholder="e.g. 78.407000"
                  required
                  inputClassName="font-mono text-xs"
                />
              </div>

              <TextField
                label="Special Instructions"
                name="special_instructions"
                value={formData.special_instructions}
                onChange={handleInput}
                placeholder="e.g. Collect from service entrance; please bring insulated carriers."
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading || !!timeError}
              loading={loading}
              loadingText="Creating…"
              variant="primary"
              size="lg"
              icon={Send}
              className="px-8 shadow-lg"
            >
              Create Donation Offer
            </Button>
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

export default CreateDonationPage;

