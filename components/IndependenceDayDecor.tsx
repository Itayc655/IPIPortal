import React from 'react';

const IndependenceDayDecor = ({ isVisible }: { isVisible: boolean }) => {

    if (!isVisible) return null;

    const numFlags = 22;

    return (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] scale-x-[1.05] h-[120px] md:h-[150px] 2xl:h-[180px] pointer-events-none z-[100] overflow">
            <style>{`
                /* הקסם: דוחפים את כל ההדר למטה! */
                /* בגלל שזה margin על ההדר, זה אוטומטית דוחף את הבאנר האדום ושאר האתר למטה ולא מסתיר כלום */
                header {
                    margin-top: 10px !important;
                    transition: margin-top 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @media (min-width: 10000px) { 
                    header { margin-top: 110px !important; }
                }
                
                @media (min-width: 10000px) { 
                    header { margin-top: 140px !important; }
                }
                
                @keyframes bunting-breeze {
                    0%, 100% { transform: rotate(var(--base-rot)) skewX(0deg); }
                    50% { transform: rotate(calc(var(--base-rot) + 4deg)) skewX(-2deg); }
                }
                .bunting-flag {
                    position: absolute;
                    transform-origin: top center;
                    animation: bunting-breeze 3.5s ease-in-out infinite;
                }
            `}</style>

            {/* החוט - שומר על עובי קבוע ולא נעלם גם במסכים רחבים מאוד */}
            <svg className="absolute top-0 left-0 w-full h-full overflow-visible drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M -5 0 Q 50 140 105 0" fill="none" stroke="#94a3b8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* פיזור הדגלים */}
            {Array.from({ length: numFlags }).map((_, i) => {
                const t = (i + 1) / (numFlags + 1);
                const xPercent = t * 100;
                const nx = (t * 2) - 1;

                // חישוב עומק - הפעם קצת יותר "מתוח" כמו בתמונה שלך
                const yPercent = 100 * (1 - nx * nx);

                // זווית עדינה מאוד, כוח המשיכה משאיר אותם יחסית ישרים
                const rotation = nx * 14;

                const isHiddenMobile = (i < 2 || i > numFlags - 3);

                return (
                    <div
                        key={i}
                        className={`bunting-flag drop-shadow-md ${isHiddenMobile ? 'hidden md:block' : 'block'}`}
                        style={{
                            left: `${xPercent}%`,
                            top: `${yPercent}%`,
                            marginLeft: 'calc(-18px)',
                            marginTop: '-1px',
                            '--base-rot': `${rotation}deg`,
                            animationDelay: `${i * 0.15}s`
                        } as React.CSSProperties}
                    >
                        {/* השרוול הלבן העליון (חיבור לחוט) */}
                        <div className="w-full h-2 bg-white border-b border-slate-200 rounded-t-[2px] absolute -top-1 left-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"></div>

                        {/* דגל בעיצוב הקלאסי */}
                        <svg
                            className="w-[36px] h-[50px] md:w-[42px] md:h-[58px] 2xl:w-[48px] 2xl:h-[66px] relative z-0"
                            viewBox="0 0 40 55" fill="none" xmlns="http://www.w3.org/2000/svg"
                        >
                            <rect width="40" height="55" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                            <rect x="0" y="8" width="40" height="8" fill="#1e3a8a" />
                            <rect x="0" y="39" width="40" height="8" fill="#1e3a8a" />
                            <path d="M20 21 L26 31 H14 Z" stroke="#1e3a8a" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                            <path d="M20 34 L26 24 H14 Z" stroke="#1e3a8a" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                        </svg>
                    </div>
                );
            })}
        </div>
    );
};

export default IndependenceDayDecor;