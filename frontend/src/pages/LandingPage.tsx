import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing">
      <main className="landing-main">
        <section className="landing-copy" aria-labelledby="landing-title">
          <p className="landing-eyebrow">For teams managing changing scope</p>
          <h1 id="landing-title">Good work starts with a <em>clear agreement.</em></h1>
          <p className="landing-description">
            When a new request changes the plan, Drift helps you see what moved,
            what it might affect, and what needs a human decision.
          </p>
          <div className="landing-actions">
            <Link to="/register" className="landing-primary">Start with a project <span aria-hidden="true">↗</span></Link>
            <span>Your scope. Your call.</span>
          </div>
        </section>

        <section className="landing-example" aria-label="Example scope change in Drift">
          <div className="landing-example-heading">
            <span>A change, made clear</span>
            <span className="landing-dots" aria-hidden="true">● ● ●</span>
          </div>
          <div className="landing-example-content">
            <div className="landing-example-item">
              <span className="landing-number">01</span>
              <div><span className="landing-label">Agreed scope</span><p>Monthly reporting for the client</p></div>
            </div>
            <div className="landing-example-item">
              <span className="landing-number">02</span>
              <div><span className="landing-label">New request</span><p>“Can we send the report every week?”</p></div>
            </div>
            <div className="landing-impact">
              <span className="landing-number" aria-hidden="true">↗</span>
              <div><span className="landing-label">Proposed impact</span><p>Reporting frequency may change.</p></div>
            </div>
          </div>
          <div className="landing-example-footer">
            <span>Nothing changes until your team decides.</span>
            <span>Human decision →</span>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div aria-label="How Drift works"><span>01 / Agree</span><span>02 / Compare</span><span>03 / Decide</span></div>
        <p>Comparison needs a configured model service. Drift never approves a change for you.</p>
        <small>Comparison needs a configured model service.</small>
      </footer>
    </div>
  );
}
