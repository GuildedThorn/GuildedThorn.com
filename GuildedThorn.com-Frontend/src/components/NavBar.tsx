import { useEffect, useState } from "react";
import { FaScroll, FaQuestion } from "react-icons/fa";
import { Link } from "react-router-dom";
import { CgHome } from "react-icons/cg";
import { FaRadio } from "react-icons/fa6";

function NavBar() {
    
    const [isOpen, setIsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(dark);
    }, []);

    return (
        <nav className="w-full fixed top-0 left-0 z-50 bg-zinc-50 dark:bg-neutral-800 shadow-md text-neutral-700 dark:text-neutral-100 lg:flex-wrap lg:justify-start lg:py-4">
            <div className="flex w-full flex-wrap items-center justify-between">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle navigation"
                    className="block p-2 lg:hidden bg-transparent rounded"
                    style={{ backgroundColor: "transparent" }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isDarkMode ? "white" : "black"}
                        strokeWidth="1.5"
                        style={{ stroke: isDarkMode ? "white" : "black", strokeWidth: 1.5 }}
                        className="w-7 h-7"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5"
                        />
                    </svg>
                </button>

                <div
                    className={`mt-2 flex-grow basis-[100%] items-center lg:mt-0 lg:flex lg:basis-auto transition-all duration-300 ease-in-out ${
                        isOpen ? "flex" : "hidden"
                    }`}
                >
                    <ul className="list-style-none me-auto flex flex-col ps-0 lg:mt-1 lg:flex-row">
                        <li className="my-4 ps-2 lg:my-0 lg:pe-1 lg:ps-2">
                            <Link to="/" className="text-black dark:text-white lg:px-2">
                                <CgHome className="inline-block mr-1 text-lg" />
                                Home
                            </Link>
                        </li>
                        <li className="mb-4 ps-2 lg:mb-0 lg:pe-1 lg:ps-0">
                            <Link
                                to="/blog"
                                className="text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 lg:px-2"
                            >
                                <FaScroll className="inline-block mr-1 text-lg" />
                                Blog
                            </Link>
                        </li>
                        <li className="mb-4 ps-2 lg:mb-0 lg:pe-1 lg:ps-0">
                            <Link
                                to="/radio"
                                className="text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 lg:px-2"
                            >
                                <FaRadio className="inline-block mr-1 text-lg" />
                                Radio
                            </Link>
                        </li>
                        <li className="my-4 ps-2 lg:my-0 lg:pe-1 lg:ps-0">
                            <Link
                                to="/contact"
                                className="text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 lg:px-2"
                            >
                                <FaQuestion className="inline-block mr-1 text-lg" />
                                Contact
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default NavBar;
