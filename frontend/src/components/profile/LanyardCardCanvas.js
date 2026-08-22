/**
 * LanyardCardCanvas.js
 * High-clarity canvas textures for FoodBridge ID card (front & back)
 * and the fabric lanyard ribbon. Uses 2× DPI (1200×1800) for crisp rendering.
 */

export function generateCardFrontTexture(userData) {
  // 2× high-DPI resolution for crisp text
  const width = 1200;
  const height = 1800;
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
  ctx.fillRect(0, 0, width, 40);

  // Outer border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  // Lanyard hole guide
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 60, 60, 120, 20, 10);
  ctx.fill();

  // ---------- HEADER ----------
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 68px system-ui, Arial, sans-serif';
  ctx.fillText('FOODBRIDGE', 80, 192);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 28px system-ui, Arial, sans-serif';
  ctx.fillText('OFFICIAL NETWORK IDENTITY DOCUMENT', 80, 234);

  // Brand circle
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(width - 130, 178, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FB', width - 130, 194);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 270);
  ctx.lineTo(width - 80, 270);
  ctx.stroke();

  // ---------- AVATAR + NAME ----------
  const avatarCX = 200;
  const avatarCY = 450;
  const avatarR = 120;

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.fill();

  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(initials || 'FB', avatarCX, avatarCY + 28);
  ctx.textAlign = 'left';

  const nameX = avatarCX + avatarR + 48;
  const displayName = name.length > 20 ? name.slice(0, 18) + '\u2026' : name;

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 60px system-ui, Arial, sans-serif';
  ctx.fillText(displayName, nameX, 396);

  // Role pill
  const pillW = 370;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(nameX, 416, pillW, 56, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(role.toUpperCase() + ' CREDENTIAL', nameX + pillW / 2, 453);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 26px system-ui, Arial, sans-serif';
  ctx.fillText('\u25cf ' + status, nameX, 520);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 24px system-ui, Arial, sans-serif';
  ctx.fillText('\uD83D\uDCCD ' + location, nameX, 564);

  // ---------- SEPARATOR ----------
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 614);
  ctx.lineTo(width - 80, 614);
  ctx.stroke();

  // ---------- DIGITAL ID BOX ----------
  const idBoxY = 646;
  const idBoxH = 160;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(80, idBoxY, width - 160, idBoxH, 20);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 24px system-ui, Arial, sans-serif';
  ctx.fillText('DIGITAL IDENTIFIER', 120, idBoxY + 52);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillText(id, 120, idBoxY + 128);

  // Chip icon
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(width - 220, idBoxY + 36, 100, 76, 12);
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 3;
  ctx.strokeRect(width - 206, idBoxY + 48, 72, 52);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  [14, 30, 46].forEach((off) => {
    ctx.beginPath();
    ctx.moveTo(width - 206, idBoxY + 48 + off);
    ctx.lineTo(width - 134, idBoxY + 48 + off);
    ctx.stroke();
  });

  // ---------- METRIC CARDS ----------
  const metY = 852;
  const metH = 220;
  const metW = (width - 200) / 2;

  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(80, metY, metW, metH, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 24px system-ui, Arial, sans-serif';
  ctx.fillText(metric1.label, 116, metY + 60);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 88px system-ui, Arial, sans-serif';
  ctx.fillText(metric1.value, 116, metY + 176);

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(80 + metW + 40, metY, metW, metH, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 24px system-ui, Arial, sans-serif';
  ctx.fillText(metric2.label, 80 + metW + 76, metY + 60);
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 88px system-ui, Arial, sans-serif';
  ctx.fillText(metric2.value, 80 + metW + 76, metY + 176);

  // ---------- HOLOGRAPHIC STRIP ----------
  const holoY = 1122;
  const holoGrad = ctx.createLinearGradient(80, holoY, width - 80, holoY + 80);
  holoGrad.addColorStop(0, '#C7D2FE');
  holoGrad.addColorStop(0.25, '#FEF08A');
  holoGrad.addColorStop(0.5, '#A7F3D0');
  holoGrad.addColorStop(0.75, '#BAE6FD');
  holoGrad.addColorStop(1, '#DDD6FE');
  ctx.fillStyle = holoGrad;
  ctx.beginPath();
  ctx.roundRect(80, holoY, width - 160, 80, 14);
  ctx.fill();
  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.font = 'bold 24px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u2605  SECURE DIGITAL AUTHENTICITY BADGE  \u00b7  FOODBRIDGE ECOSYSTEM  \u2605', width / 2, holoY + 50);
  ctx.textAlign = 'left';

  // ---------- BARCODE ----------
  const bcY = 1250;
  ctx.fillStyle = '#0F172A';
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let curX = 80;
  while (curX < width - 80) {
    const bw = ((seed * (curX + 7)) % 6) + 3;
    ctx.fillRect(curX, bcY, bw, 100);
    curX += bw + ((seed * (curX + 3)) % 6) + 3;
  }
  ctx.fillStyle = '#334155';
  ctx.font = '500 26px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(id + '  \u00b7  ECDSAP256', width / 2, bcY + 140);
  ctx.textAlign = 'left';

  // ---------- FOOTER ----------
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 22px system-ui, Arial, sans-serif';
  ctx.fillText(`ISSUED: ${new Date().getFullYear()}  \u00b7  AUTH: SEC-SHA256  \u00b7  ${email}`, 80, 1500);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 20px system-ui, Arial, sans-serif';
  ctx.fillText('This credential validates authorized participation in FoodBridge rescue operations.', 80, 1540);

  // Bottom accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, height - 40, width, 40);

  return canvas.toDataURL('image/png');
}

export function generateCardBackTexture(userData) {
  const width = 1200;
  const height = 1800;
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
  ctx.fillRect(0, 0, width, 40);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 60, 60, 120, 20, 10);
  ctx.fill();

  // Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 58px system-ui, Arial, sans-serif';
  ctx.fillText('FOODBRIDGE NETWORK', 80, 200);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 28px system-ui, Arial, sans-serif';
  ctx.fillText('SURPLUS FOOD REDISTRIBUTION PROTOCOL', 80, 252);

  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 292);
  ctx.lineTo(width - 80, 292);
  ctx.stroke();

  // QR code
  const qrSize = 320;
  const qrX = (width - qrSize) / 2;
  const qrY = 342;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 20);
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
  ctx.font = 'bold 28px system-ui, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN TO VERIFY CREDENTIAL', width / 2, qrY + qrSize + 56);
  ctx.textAlign = 'left';

  // Compliance box
  const boxY = 802;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(80, boxY, width - 160, 440, 20);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px system-ui, Arial, sans-serif';
  ctx.fillText('Standard Operating Compliance', 120, boxY + 72);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 26px system-ui, Arial, sans-serif';
  const guidelines = [
    '\u00b7  Food quality checks conform to safe distribution norms.',
    '\u00b7  Real-time temperature & transit logging is mandatory.',
    '\u00b7  Zero food waste target maintained across all hubs.',
    '\u00b7  Authorized for seamless checkpoint entry and handoff.',
  ];
  guidelines.forEach((g, i) => {
    ctx.fillText(g, 120, boxY + 140 + i * 64);
  });

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 28px system-ui, Arial, sans-serif';
  ctx.fillText(`ROLE ACCESS: ${role.toUpperCase()} (TIER 1)`, 120, boxY + 404);

  // Hotline
  const hotlineY = 1302;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(80, hotlineY, width - 160, 160, 20);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 26px system-ui, Arial, sans-serif';
  ctx.fillText('DISPATCH & RAPID RESPONSE HELPLINE', 120, hotlineY + 60);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 34px "Courier New", monospace';
  ctx.fillText('+1 (800) 555-FOOD  \u00b7  support@foodbridge.org', 120, hotlineY + 118);

  // Footer cert
  ctx.fillStyle = '#475569';
  ctx.font = '500 22px "Courier New", monospace';
  ctx.fillText(`CERT: ${id}-ECDSA-P256-VERIFIED`, 80, 1532);
  ctx.fillText('FoodBridge Initiative \u00b7 Decentralized Relief Logistics', 80, 1568);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, height - 40, width, 40);

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
