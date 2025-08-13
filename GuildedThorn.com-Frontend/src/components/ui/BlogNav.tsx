import { Link } from "react-router-dom";
import { FaStream } from "react-icons/fa";

export default function BlogNav() {

    const navItems = [
        { to: "/blog/pages", label: "Home", icon: <FaStream className="inline-block mr-1 text-lg" /> },
    ];

    return (
        <nav className="bg-white shadow-md dark:bg-gray-900 dark:shadow-gray-800">
            <div className="mx-auto px-6 flex justify-between items-center h-16">
                {/* Right: Links & hamburger */}
                <div className="flex items-center">
                    {/* Desktop links */}
                    <div className="lg:flex items-center space-x-4 xl:space-x-6">
                        {navItems.map((item) => (
                            <Link key={item.to} to={item.to} className="nav-link inline-flex items-center">
                                {item.icon}
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    
                </div>
            </div>
            
        </nav>
    );
}
