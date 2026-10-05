/**
 * LanyardCardCanvas.js
 * High-clarity canvas textures for FoodBridge ID card (front & back)
 * and the fabric lanyard ribbon. Uses 2× DPI (1200×1800) for crisp rendering.
 */

// Cross-browser helper for rounded rectangles on Canvas 2D
function drawRoundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = typeof radius === 'number'
      ? { tl: radius, tr: radius, br: radius, bl: radius }
      : { tl: 0, tr: 0, br: 0, bl: 0, ...radius };
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  }
}

export function generateCardFrontTexture(userData) {
  // 4× high-DPI resolution for maximum sharpness
  const width = 1600;
  const height = 2400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const {
    name = 'Dave Donor',
    role = 'DONOR',
    id = 'FB-DON-884920',
    email = 'donor@foodbridge.org',
    metric1 = { label: 'DONATIONS', value: '24' },
    metric2 = { label: 'MEALS SAVED', value: '1,200+' },
    status = 'VERIFIED PARTNER',
    accentColor = '#FF5A2F',
    location = 'Hyderabad, TS',
  } = userData || {};

  // ---------- BACKGROUND ----------
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Top accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 54);

  // Outer border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Lanyard hole guide
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  drawRoundRect(ctx, width / 2 - 80, 80, 160, 28, 14);
  ctx.fill();

  // ---------- HEADER ----------
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 90px system-ui, Arial, sans-serif';
  ctx.fillText('FOODBRIDGE', 106, 256);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 37px system-ui, Arial, sans-serif';
  ctx.fillText('OFFICIAL NETWORK IDENTITY DOCUMENT', 106, 312);

  // Brand circle
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(width - 174, 238, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 58px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FB', width - 174, 258);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(106, 360);
  ctx.lineTo(width - 106, 360);
  ctx.stroke();

  // ---------- AVATAR + NAME ----------
  const avatarCX = 266;
  const avatarCY = 600;
  const avatarR = 160;

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.fill();

  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 106px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(initials || 'FB', avatarCX, avatarCY + 38);
  ctx.textAlign = 'left';

  const nameX = avatarCX + avatarR + 64;
  const displayName = name.length > 20 ? name.slice(0, 18) + '\u2026' : name;

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 80px system-ui, Arial, sans-serif';
  ctx.fillText(displayName, nameX, 528);

  // Role pill
  const pillW = 494;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  drawRoundRect(ctx, nameX, 554, pillW, 74, 14);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(role.toUpperCase() + ' CREDENTIAL', nameX + pillW / 2, 603);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 34px system-ui, Arial, sans-serif';
  ctx.fillText('\u25cf ' + status, nameX, 692);

  // Location icon & text
  const pinX = nameX + 8;
  const pinY = 735;
  ctx.strokeStyle = '#64748B';
  ctx.fillStyle = '#64748B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pinX, pinY - 8, 9, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(pinX, pinY + 8);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pinX, pinY - 8, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64748B';
  ctx.font = '500 32px system-ui, Arial, sans-serif';
  ctx.fillText(location, nameX + 28, 746);


  // ---------- SEPARATOR ----------
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(106, 820);
  ctx.lineTo(width - 106, 820);
  ctx.stroke();

  // ---------- DIGITAL ID BOX ----------
  const idBoxY = 860;
  const idBoxH = 214;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  drawRoundRect(ctx, 106, idBoxY, width - 212, idBoxH, 26);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 32px system-ui, Arial, sans-serif';
  ctx.fillText('DIGITAL IDENTIFIER', 160, idBoxY + 70);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 85px "Courier New", monospace';
  ctx.fillText(id, 160, idBoxY + 170);

  // Chip icon
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  drawRoundRect(ctx, width - 294, idBoxY + 48, 134, 100, 16);
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 4;
  ctx.strokeRect(width - 275, idBoxY + 64, 96, 70);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  [18, 40, 62].forEach((off) => {
    ctx.beginPath();
    ctx.moveTo(width - 275, idBoxY + 64 + off);
    ctx.lineTo(width - 179, idBoxY + 64 + off);
    ctx.stroke();
  });

  // ---------- METRIC CARDS ----------
  const metY = 1136;
  const metH = 294;
  const metW = (width - 266) / 2;

  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  drawRoundRect(ctx, 106, metY, metW, metH, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 32px system-ui, Arial, sans-serif';
  ctx.fillText(metric1.label, 154, metY + 80);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 118px system-ui, Arial, sans-serif';
  ctx.fillText(metric1.value, 154, metY + 234);

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  drawRoundRect(ctx, 106 + metW + 54, metY, metW, metH, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 32px system-ui, Arial, sans-serif';
  ctx.fillText(metric2.label, 106 + metW + 100, metY + 80);
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 118px system-ui, Arial, sans-serif';
  ctx.fillText(metric2.value, 106 + metW + 100, metY + 234);

  // ---------- HOLOGRAPHIC STRIP ----------
  const holoY = 1496;
  const holoGrad = ctx.createLinearGradient(106, holoY, width - 106, holoY + 106);
  holoGrad.addColorStop(0, '#C7D2FE');
  holoGrad.addColorStop(0.25, '#FEF08A');
  holoGrad.addColorStop(0.5, '#A7F3D0');
  holoGrad.addColorStop(0.75, '#BAE6FD');
  holoGrad.addColorStop(1, '#DDD6FE');
  ctx.fillStyle = holoGrad;
  ctx.beginPath();
  drawRoundRect(ctx, 106, holoY, width - 212, 106, 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.font = 'bold 32px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u2605  SECURE DIGITAL AUTHENTICITY BADGE  \u00b7  FOODBRIDGE ECOSYSTEM  \u2605', width / 2, holoY + 67);
  ctx.textAlign = 'left';

  // ---------- BARCODE ----------
  const bcY = 1666;
  ctx.fillStyle = '#0F172A';
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let curX = 106;
  while (curX < width - 106) {
    const bw = ((seed * (curX + 7)) % 6) + 4;
    ctx.fillRect(curX, bcY, bw, 134);
    curX += bw + ((seed * (curX + 3)) % 6) + 4;
  }
  ctx.fillStyle = '#334155';
  ctx.font = '500 35px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(id + '  \u00b7  ECDSAP256', width / 2, bcY + 186);
  ctx.textAlign = 'left';

  // ---------- FOOTER ----------
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 29px system-ui, Arial, sans-serif';
  ctx.fillText(`ISSUED: ${new Date().getFullYear()}  \u00b7  AUTH: SEC-SHA256  \u00b7  ${email}`, 106, 2000);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 27px system-ui, Arial, sans-serif';
  ctx.fillText('This credential validates authorized participation in FoodBridge rescue operations.', 106, 2053);

  // Bottom accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, height - 54, width, 54);

  return canvas.toDataURL('image/png');
}

export function generateCardBackTexture(userData) {
  const width = 1600;
  const height = 2400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const {
    id = 'FB-DON-884920',
    role = 'DONOR',
    accentColor = '#FF5A2F',
  } = userData || {};

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 54);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  drawRoundRect(ctx, width / 2 - 80, 80, 160, 28, 14);
  ctx.fill();

  // Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 78px system-ui, Arial, sans-serif';
  ctx.fillText('FOODBRIDGE NETWORK', 106, 266);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 37px system-ui, Arial, sans-serif';
  ctx.fillText('SURPLUS FOOD REDISTRIBUTION PROTOCOL', 106, 336);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(106, 390);
  ctx.lineTo(width - 106, 390);
  ctx.stroke();

  // QR code
  const qrSize = 426;
  const qrX = (width - qrSize) / 2;
  const qrY = 456;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  drawRoundRect(ctx, qrX - 26, qrY - 26, qrSize + 52, qrSize + 52, 26);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  const qrGrid = 20;
  const cellSize = qrSize / qrGrid;
  for (let r = 0; r < qrGrid; r++) {
    for (let c = 0; c < qrGrid; c++) {
      const isTL = r < 5 && c < 5;
      const isTR = r < 5 && c >= qrGrid - 5;
      const isBL = r >= qrGrid - 5 && c < 5;
      if (isTL || isTR || isBL) {
        if (r === 0 || r === 4 || c === 0 || c === 4 ||
            (isBL && (r === qrGrid - 5 || r === qrGrid - 1)) ||
            (isTR && (c === qrGrid - 5 || c === qrGrid - 1))) {
          ctx.fillRect(qrX + c * cellSize + 1, qrY + r * cellSize + 1, cellSize - 2, cellSize - 2);
        } else if ((r >= 1 && r <= 3) && (c >= 1 && c <= 3)) {
          ctx.fillRect(qrX + c * cellSize + 1, qrY + r * cellSize + 1, cellSize - 2, cellSize - 2);
        }
      } else if ((r * 11 + c * 7 + id.length * 3) % 3 !== 0) {
        ctx.fillRect(qrX + c * cellSize + 1, qrY + r * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }
  }

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 37px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO VERIFY CREDENTIAL', width / 2, qrY + qrSize + 74);
  ctx.textAlign = 'left';

  // Compliance box
  const boxY = 1070;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  drawRoundRect(ctx, 106, boxY, width - 212, 586, 26);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 46px system-ui, Arial, sans-serif';
  ctx.fillText('Standard Operating Compliance', 160, boxY + 96);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 35px system-ui, Arial, sans-serif';
  const guidelines = [
    '\u00b7  Food quality checks conform to safe distribution norms.',
    '\u00b7  Real-time temperature & transit logging is mandatory.',
    '\u00b7  Zero food waste target maintained across all hubs.',
    '\u00b7  Authorized for seamless checkpoint entry and handoff.',
  ];
  guidelines.forEach((g, i) => {
    ctx.fillText(g, 160, boxY + 186 + i * 86);
  });

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 37px system-ui, Arial, sans-serif';
  ctx.fillText(`ROLE ACCESS: ${role.toUpperCase()} (TIER 1)`, 160, boxY + 538);

  // Hotline
  const hotlineY = 1736;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  drawRoundRect(ctx, 106, hotlineY, width - 212, 214, 26);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 35px system-ui, Arial, sans-serif';
  ctx.fillText('DISPATCH & RAPID RESPONSE HELPLINE', 160, hotlineY + 80);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 46px "Courier New", monospace';
  ctx.fillText('+1 (800) 555-FOOD  \u00b7  support@foodbridge.org', 160, hotlineY + 158);

  // Footer cert
  ctx.fillStyle = '#475569';
  ctx.font = '500 29px "Courier New", monospace';
  ctx.fillText(`CERT: ${id}-ECDSA-P256-VERIFIED`, 106, 2042);
  ctx.fillText('FoodBridge Initiative \u00b7 Decentralized Relief Logistics', 106, 2091);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, height - 54, width, 54);

  return canvas.toDataURL('image/png');
}

export function generateLanyardStrapTexture(accentColor = '#FF5A2F') {
  const width = 2048;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  // Diagonal weave
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let x = 0; x < width + height; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - height, height);
    ctx.stroke();
  }

  // Accent pinstripes
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 16);
  ctx.fillRect(0, height - 16, width, 16);

  // Repeating text
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 72px system-ui, Arial, sans-serif';
  ctx.textBaseline = 'middle';

  const text = 'FOODBRIDGE  \u2605  RESCUE NETWORK  \u2605  ';
  const textW = ctx.measureText(text).width;
  let offsetX = 0;
  while (offsetX < width + textW) {
    ctx.fillText(text, offsetX, height / 2);
    offsetX += textW + 40;
  }

  return canvas.toDataURL('image/png');
}
