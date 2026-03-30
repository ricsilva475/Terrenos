import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { doSignOut } from "../../firebase/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";
import "./header.css";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userLoggedIn } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (location.pathname === "/" || location.pathname === "/register") {
    return null;
  }

  const isActive = (path) => location.pathname === path;

  const handleToggleMenu = () => setIsMenuOpen((prev) => !prev);
  const handleToggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleLogout = () => {
    doSignOut().then(() => navigate("/"));
  };

  return (
    <nav className="custom-navbar">
      <div className="custom-navbar-container">

        {/* Brand */}
        <Link to="/home" className="navbar-brand">
          <div className="navbar-brand-icon">🌿</div>
          <span className="navbar-brand-text">Gestão de Terrenos<span></span></span>
        </Link>

        {/* Desktop Menu */}
        <ul className="custom-navbar-menu">
          {userLoggedIn ? (
            <>
              <li>
                <Link to="/home" className={isActive("/home") ? "active" : ""}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/terrenos" className={isActive("/terrenos") ? "active" : ""}>
                  Adicionar
                </Link>
              </li>
              <li>
                <Link to="/vizinhos" className={isActive("/vizinhos") ? "active" : ""}>
                  Contactos
                </Link>
              </li>
              <li className="dropdown">
                <button onClick={handleToggleDropdown}>
                  Conta <FontAwesomeIcon icon={faCaretDown} style={{ fontSize: 11, opacity: 0.7 }} />
                </button>
                {isDropdownOpen && (
                  <ul className="menu-dropdown">
                    <li>
                      <Link to="/perfil" onClick={() => setIsDropdownOpen(false)}>
                        Perfil
                      </Link>
                    </li>
                    <li>
                      <button onClick={handleLogout}>Logout</button>
                    </li>
                  </ul>
                )}
              </li>
            </>
          ) : (
            <>
              <li><Link to="/">Login</Link></li>
              <li><Link to="/register">Criar Conta</Link></li>
            </>
          )}
        </ul>

        {/* Hamburger */}
        <button
          className={`custom-navbar-toggler ${isMenuOpen ? "open" : ""}`}
          onClick={handleToggleMenu}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile Menu */}
        <ul className={`custom-navbar-menu-mobile ${isMenuOpen ? "open" : ""}`}>
          {userLoggedIn ? (
            <>
              <li>
                <Link to="/home" onClick={handleToggleMenu}>Home</Link>
              </li>
              <li>
                <Link to="/terrenos" onClick={handleToggleMenu}>Adicionar Terrenos</Link>
              </li>
              <li>
                <Link to="/vizinhos" onClick={handleToggleMenu}>Contactos</Link>
              </li>
              <li>
                <Link to="/perfil" onClick={handleToggleMenu}>Perfil</Link>
              </li>
              <li className="logout-button-container">
                <button
                  onClick={() => {
                    doSignOut().then(() => {
                      navigate("/login");
                      handleToggleMenu();
                    });
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login" onClick={handleToggleMenu}>Login</Link></li>
              <li><Link to="/register" onClick={handleToggleMenu}>Criar Conta</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Header;
