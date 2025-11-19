class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                nav {
                    background-color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 1rem 2rem;
                }
                .container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .logo {
                    display: flex;
                    align-items: center;
                    font-weight: 700;
                    font-size: 1.5rem;
                    color: #1e40af;
                    text-decoration: none;
                }
                .logo-icon {
                    margin-right: 0.5rem;
                }
                .nav-links {
                    display: flex;
                    gap: 1.5rem;
                }
                .nav-link {
                    color: #4b5563;
                    text-decoration: none;
                    font-weight: 500;
                    transition: color 0.2s;
                }
                .nav-link:hover {
                    color: #1e40af;
                }
                @media (max-width: 768px) {
                    .container {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .nav-links {
                        width: 100%;
                        justify-content: space-around;
                    }
                }
            </style>
            <nav>
                <div class="container">
                    <a href="index.html" class="logo">
                        <i data-feather="shield" class="logo-icon"></i>
                        SolGuardian
                    </a>
                    <div class="nav-links">
                        <a href="index.html" class="nav-link">Home</a>
                        <a href="#" class="nav-link">Documentation</a>
                        <a href="#" class="nav-link">About</a>
                    </div>
                </div>
            </nav>
        `;
    }
}

customElements.define('custom-navbar', CustomNavbar);