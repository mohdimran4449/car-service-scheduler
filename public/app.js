// Header Component
const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <i className="fas fa-car"></i>
          <h1>Car Service Scheduler</h1>
        </div>
        <nav className="nav">
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#api">API</a></li>
            <li><a href="#status">Status</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

// Hero Component
const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <h2>Schedule Your Car Service</h2>
        <p>Effortlessly book and manage your car service appointments with our intuitive scheduling system.</p>
        <a href="#features" className="btn">Learn More</a>
        <a href="#api" className="btn btn-secondary" style={{ marginLeft: '10px' }}>API Docs</a>
      </div>
    </section>
  );
};

// Features Component
const Features = () => {
  const features = [
    {
      icon: 'fas fa-calendar-alt',
      title: 'Easy Scheduling',
      description: 'Book your car service appointment with just a few clicks.'
    },
    {
      icon: 'fas fa-bell',
      title: 'Reminders',
      description: 'Get timely notifications about your upcoming appointments.'
    },
    {
      icon: 'fas fa-history',
      title: 'Service History',
      description: 'Keep track of all your past service records in one place.'
    },
    {
      icon: 'fas fa-phone-alt',
      title: 'Voice Assistant',
      description: 'Schedule appointments via phone with our AI voice assistant.'
    },
    {
      icon: 'fas fa-tools',
      title: 'Service Options',
      description: 'Choose from various service packages tailored to your needs.'
    },
    {
      icon: 'fas fa-user-shield',
      title: 'Secure Data',
      description: 'Your personal and vehicle information is always protected.'
    }
  ];

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-title">
          <h2>Our Features</h2>
          <p>Discover how our car service scheduling system can make your life easier.</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card animate" key={index} style={{ animationDelay: `${index * 0.1}s` }}>
              <i className={feature.icon}></i>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// API Documentation Component
const ApiDocs = () => {
  const endpoints = [
    {
      method: 'GET',
      path: '/health',
      description: 'Check if the API is running properly.'
    },
    {
      method: 'GET',
      path: '/api/bookings',
      description: 'Get all bookings.'
    },
    {
      method: 'GET',
      path: '/api/bookings/:id',
      description: 'Get a specific booking by ID.'
    },
    {
      method: 'POST',
      path: '/api/bookings',
      description: 'Create a new booking.'
    },
    {
      method: 'PUT',
      path: '/api/bookings/:id/confirm',
      description: 'Confirm a booking.'
    },
    {
      method: 'PUT',
      path: '/api/bookings/:id/reschedule',
      description: 'Reschedule a booking.'
    },
    {
      method: 'PUT',
      path: '/api/bookings/:id/cancel',
      description: 'Cancel a booking.'
    }
  ];

  return (
    <section className="api-section" id="api">
      <div className="container">
        <div className="section-title">
          <h2>API Documentation</h2>
          <p>Integrate with our car service scheduling system using these endpoints.</p>
        </div>
        <div className="api-container">
          {endpoints.map((endpoint, index) => (
            <div className="endpoint" key={index}>
              <span className={`method ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
              <strong>{endpoint.path}</strong>
              <p>{endpoint.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Status Component
const Status = () => {
  const [status, setStatus] = React.useState({
    dbConnected: false,
    serverTime: '',
    loading: true
  });

  React.useEffect(() => {
    fetch('/health')
      .then(response => response.json())
      .then(data => {
        setStatus({
          dbConnected: true,
          serverTime: data.timestamp,
          loading: false
        });
      })
      .catch(error => {
        console.error('Error fetching status:', error);
        setStatus({
          dbConnected: false,
          serverTime: new Date().toISOString(),
          loading: false
        });
      });
  }, []);

  return (
    <section className="status-section" id="status">
      <div className="container">
        <div className="section-title">
          <h2>System Status</h2>
          <p>Check the current status of our services.</p>
        </div>
        <div className="status-container">
          {status.loading ? (
            <p>Loading status...</p>
          ) : (
            <>
              <p>
                <span className={`status-indicator ${status.dbConnected ? 'status-online' : 'status-offline'}`}></span>
                Database: {status.dbConnected ? 'Connected' : 'Disconnected'}
              </p>
              <p>Server Time: {status.serverTime}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>About Us</h3>
            <p>We provide a seamless car service scheduling experience for both customers and service providers.</p>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#api">API</a></li>
              <li><a href="#status">Status</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <ul>
              <li><i className="fas fa-envelope"></i> support@carservice.com</li>
              <li><i className="fas fa-phone"></i> +1 (123) 456-7890</li>
              <li><i className="fas fa-map-marker-alt"></i> 123 Service St, Auto City</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Car Service Scheduler. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
const App = () => {
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <ApiDocs />
      <Status />
      <Footer />
    </>
  );
};

// Render the App
ReactDOM.render(<App />, document.getElementById('root'));
