import { Wallet } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function LoginPage() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert('Failed to sign in. Please try again!');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon-wrap">
          <Wallet size={48} strokeWidth={1.8} color="#5B4FE8" />
        </div>

        <h1 className="login-title">ExpenseTracker</h1>
        <p className="login-sub">
          Track your daily expenses quickly,<br />neatly, and easily.
        </p>

        <button className="login-btn" onClick={handleLogin}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            width="24"
          />
          Sign in with Google
        </button>

        <p className="login-footer">© 2026 ExpenseTracker · Built with ☕</p>
      </div>
    </div>
  );
}
