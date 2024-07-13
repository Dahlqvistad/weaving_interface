export default function NavBar() {
    return (
        <div>
            <nav className="navbar">
                <div className="navbar__left">
                    <div className="navbar__logo">Logo</div>
                </div>
                <div className="navbar__right">
                    <div className="navbar__item">Home</div>
                    <div className="navbar__item">About</div>
                    <div className="navbar__item">Contact</div>
                </div>
            </nav>
        </div>
    );
}
