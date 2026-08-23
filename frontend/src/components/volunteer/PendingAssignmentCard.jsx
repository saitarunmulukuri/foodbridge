import { CheckCircle2, XCircle, Package, Home, ArrowDown, Clock, Navigation, Boxes } from 'lucide-react';
import { Button } from '../common/Button';
import { ExpiryTimer } from '../common/ExpiryTimer';
import { GlareHover } from '../magicui/GlareHover';

export const PendingAssignmentCard = ({ assignment, onAccept, onDecline, loading }) => {
  const donation = assignment.donation || {};
  const assignmentId = assignment.assignment_id || assignment.id;

  // 1. Food title
  const title = donation.donation_title || assignment.donation_title || `Food Donation #${assignment.ngo_request_id || assignmentId}`;

  // 2. Quantity
  const totalQty = donation.total_quantity ?? assignment.total_quantity;
  const unit = donation.quantity_unit || assignment.quantity_unit;
  const quantityText = totalQty ? `${totalQty}${unit ? ` ${unit.toLowerCase()}${totalQty > 1 && !unit.toLowerCase().endsWith('s') ? 's' : ''}` : ''}` : null;

  // 3. Route information: Pickup (Donor) -> Delivery (NGO)
  const donorName = donation.donor?.organization_name || donation.donor_name || assignment.donor_name || 'Pickup Location';
  const pickupAddress = donation.pickup_address || assignment.pickup_address || null;

  const ngoName = assignment.ngo?.organization_name || assignment.ngo_name || assignment.ngo_request?.ngo?.organization_name || 'Community Center / NGO';
  const deliveryAddress = assignment.delivery_address || assignment.dropoff_address || assignment.ngo?.address || assignment.ngo_request?.ngo?.address || null;

  // 4. Distance and estimated time (if provided)
  const distance = assignment.distance_km || assignment.distance || null;
  const estimatedTime = assignment.estimated_time || (assignment.duration_minutes ? `~${assignment.duration_minutes} min` : null);

  // 5. Expiry and Urgency
  const expiryTime = donation.expiry_time || assignment.expiry_time || null;
  const rawUrgency = (donation.urgency || assignment.urgency || '').toUpperCase();
  const isUrgent = rawUrgency === 'URGENT' || rawUrgency === 'CRITICAL';

  return (
    <GlareHover
      className="vd-card-glare-wrap"
      duration={600}
      opacity={0.3}
      glareColor="linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.4) 45%, rgba(255, 90, 47, 0.15) 50%, rgba(255, 255, 255, 0.4) 55%, transparent 80%)"
    >
      <div className="vd-assignment-card" role="article" aria-label={`Pending delivery assignment for ${title}`}>
        {/* Top Eyebrow Row */}
        <div className="vd-card-top-row">
          <span className="vd-card-category">Food Donation</span>
          {isUrgent && (
            <span className="vd-card-urgency" role="status">
              {rawUrgency}
            </span>
          )}
        </div>

        {/* Title and Quantity */}
        <h3 className="vd-card-title">{title}</h3>
        {quantityText && (
          <div className="vd-card-quantity">
            <Boxes size={14} className="text-[#FF5A2F] shrink-0" aria-hidden="true" />
            <span>{quantityText}</span>
          </div>
        )}

        {/* Route Section */}
        <div className="vd-card-route">
          {/* Pickup Stop */}
          <div className="vd-route-stop">
            <div className="vd-route-icon-wrap vd-route-icon-wrap--pickup" aria-hidden="true">
              <Package size={14} className="text-[#FF5A2F]" />
            </div>
            <div className="vd-route-info">
              <span className="vd-route-tag">Pickup</span>
              <p className="vd-route-name">{donorName}</p>
              {pickupAddress && <p className="vd-route-address">{pickupAddress}</p>}
            </div>
          </div>

          {/* Route connector */}
          <div className="vd-route-connector" aria-hidden="true">
            <div className="vd-route-line" />
            <ArrowDown size={13} className="vd-route-arrow-icon" />
          </div>

          {/* Delivery Stop */}
          <div className="vd-route-stop">
            <div className="vd-route-icon-wrap vd-route-icon-wrap--delivery" aria-hidden="true">
              <Home size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="vd-route-info">
              <span className="vd-route-tag">Delivery</span>
              <p className="vd-route-name">{ngoName}</p>
              {deliveryAddress && <p className="vd-route-address">{deliveryAddress}</p>}
            </div>
          </div>
        </div>

        {/* Meta Row: Distance, Time, Expiry */}
        <div className="vd-card-meta-row">
          <div className="vd-card-meta-badges">
            {distance && (
              <span className="vd-card-meta-item" title="Estimated distance">
                <Navigation size={12} className="text-blue-500 shrink-0" aria-hidden="true" />
                <span>{distance} km</span>
              </span>
            )}
            {estimatedTime && (
              <span className="vd-card-meta-item" title="Estimated duration">
                <Clock size={12} className="text-amber-500 shrink-0" aria-hidden="true" />
                <span>{estimatedTime}</span>
              </span>
            )}
          </div>

          {expiryTime && (
            <div className="vd-card-expiry" title="Donation expiry">
              <Clock size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
              <ExpiryTimer expiryTime={expiryTime} compact />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="vd-card-actions">
          <Button
            id={`decline-${assignmentId}`}
            onClick={() => onDecline(assignmentId)}
            disabled={loading}
            variant="danger"
            size="sm"
            icon={XCircle}
            className="flex-1 justify-center"
            aria-label={`Reject delivery assignment for ${title}`}
          >
            Reject
          </Button>
          <Button
            id={`accept-${assignmentId}`}
            onClick={() => onAccept(assignmentId)}
            disabled={loading}
            loading={loading}
            loadingText="Accepting…"
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            className="flex-1 justify-center"
            aria-label={`Accept delivery assignment for ${title}`}
          >
            Accept
          </Button>
        </div>
      </div>
    </GlareHover>
  );
};

export default PendingAssignmentCard;
