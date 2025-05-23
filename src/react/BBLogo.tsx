
import logoWhite from "../assets/logo-white.svg";
import drakesLogo from "../assets/drakes-hollywood-logo.png";

interface BBLogoProps {
  size?: number;
  showBeta?: boolean;
}

export default function BBLogo({ size = 200, showBeta = true }: BBLogoProps) {
  return (
    <div style={{ display: 'flex', gap: '42px', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <img
          src={logoWhite}
          alt="BB Logo"
          style={{
            width: `${size}px`,
            height: 'auto',
            display: 'block'
          }}
        />
        {showBeta && (
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            backgroundColor: '#a18d52',
            padding: '2px 4px',
            borderRadius: '4px'
          }}>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>BETA</span>
          </div>
        )}
      </div>
      <img
        src={drakesLogo}
        alt="Drake's Hollywood Logo"
        style={{
          width: `${size * 2}px`,
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  );
}