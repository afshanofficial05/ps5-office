import React, { useState } from 'react';
import { Share2, Copy, Check, MessageSquare, X } from 'lucide-react';

export default function WhatsAppShareModal({ match, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!match) return null;

  const sideAPlayers = match.players?.filter(p => p.side === 'SIDE_A') || [];
  const sideBPlayers = match.players?.filter(p => p.side === 'SIDE_B') || [];

  const teamAName = sideAPlayers[0]?.team_name || 'Team A';
  const teamBName = sideBPlayers[0]?.team_name || 'Team B';

  const playerANames = sideAPlayers.map(p => p.player_name || p.player_code).join(' & ');
  const playerBNames = sideBPlayers.map(p => p.player_name || p.player_code).join(' & ');

  const scoreA = match.result?.score_a ?? 0;
  const scoreB = match.result?.score_b ?? 0;
  const winnerSide = match.result?.winner_side;
  const isPens = !!match.result?.is_penalty_shootout;
  const penA = match.result?.penalty_score_a;
  const penB = match.result?.penalty_score_b;

  let outcomeText = '';
  if (winnerSide === 'SIDE_A') {
    outcomeText = `🏆 ${playerANames} (${teamAName}) defeated ${playerBNames} (${teamBName})${isPens ? ` on penalties (${penA}-${penB})` : ''}!`;
  } else if (winnerSide === 'SIDE_B') {
    outcomeText = `🏆 ${playerBNames} (${teamBName}) defeated ${playerANames} (${teamAName})${isPens ? ` on penalties (${penB}-${penA})` : ''}!`;
  } else {
    outcomeText = `🤝 Draw match between ${playerANames} (${teamAName}) and ${playerBNames} (${teamBName})!`;
  }

  const scoreDisplay = isPens ? `${scoreA} - ${scoreB} (${penA}-${penB} on pens)` : `${scoreA} - ${scoreB}`;

  const message = 
`⚽ *PSO GAMING PLATFORM - MATCH RESULT* ⚽
━━━━━━━━━━━━━━━━━━━━━
🎮 *Match ID:* ${match.match_code}
🕹️ *Mode:* ${match.game_mode}
📊 *Score:* ${scoreDisplay}
${outcomeText}
📌 *Status:* ${match.status}
━━━━━━━━━━━━━━━━━━━━━
View live ratings & leaderboard: http://localhost:3000/leaderboards`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppRedirect = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Share on WhatsApp</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Broadcast match outcome to your office gaming group</p>
          </div>
        </div>

        {/* Message Preview Box */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: '#0f172a',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
          marginBottom: '20px',
          maxHeight: '220px',
          overflowY: 'auto'
        }}>
          {message}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
          
          <button
            onClick={handleWhatsAppRedirect}
            className="btn btn-whatsapp"
            style={{ flex: 1.5 }}
          >
            <Share2 size={18} />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
