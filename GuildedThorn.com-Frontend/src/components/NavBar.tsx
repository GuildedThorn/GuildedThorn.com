import { useState } from "react";
import { FaScroll, FaQuestion } from "react-icons/fa";
import { Link } from "react-router-dom";
import { CgHome } from "react-icons/cg";
import {FaRadio} from "react-icons/fa6";

function NavBar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="w-full fixed top-0 left-0 z-50 bg-zinc-50 dark:bg-neutral-800 shadow-md text-neutral-700 dark:text-neutral-100 lg:flex-wrap lg:justify-start lg:py-4">
            <div className="flex w-full flex-wrap items-center justify-between">
                {/* Toggle button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="block border-0 bg-transparent px-2 text-black/50 hover:no-underline hover:shadow-none focus:no-underline focus:shadow-none focus:outline-none focus:ring-0 dark:text-neutral-200 lg:hidden"
                    aria-label="Toggle navigation"
                >
                    <span className="[&>svg]:w-7 [&>svg]:stroke-black/50 dark:[&>svg]:stroke-neutral-200">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </span>
                </button>

                {/* Collapsible menu */}
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
                                to="/about"
                                className="text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 lg:px-2"
                            >
                                <FaQuestion className="inline-block mr-1 text-lg" />
                                About
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default NavBar;
