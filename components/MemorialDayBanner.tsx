import React from 'react';

// מגדירים את סוגי המצבים האפשריים לבאנר
export type MemorialType = 'holocaust' | 'idf' | null;

const MemorialDayBanner = ({ type }: { type: MemorialType }) => {
    // אם לא נבחר אף יום זיכרון, לא מרנדרים כלום
    if (!type) return null;

    // הטקסט המותאם לפי סוג היום
    const text = type === 'holocaust' 
        ? 'יום הזיכרון לשואה ולגבורה.' 
        : ' יום הזיכרון לחללי מערכות ישראל ולנפגעי פעולות האיבה.';

    return (
        // פס שחור שנצמד תמיד לחלק העליון ביותר של החלון
        <div className="fixed top-0 left-0 w-full h-10 md:h-12 bg-slate-950 z-[200] flex items-center justify-center border-b border-white/10 shadow-md">
            
            <style>{`
                /* דוחפים את כל האתר קצת למטה כדי שהבאנר השחור לא יסתיר את שאר האתר */
                body {
                    padding-top: 48px !important;
                }
                
                /* אנימציית ריצוף ללהבה של הנר */
                @keyframes flame-flicker {
                    0%, 100% { transform: scale(1) rotate(-1deg); opacity: 0.85; }
                    25% { transform: scale(1.05) rotate(1deg); opacity: 1; }
                    50% { transform: scale(0.95) rotate(-2deg); opacity: 0.9; }
                    75% { transform: scale(1.02) rotate(2deg); opacity: 1; }
                }
                .candle-flame {
                    animation: flame-flicker 2s ease-in-out infinite alternate;
                    filter: drop-shadow(0 0 5px rgba(251, 146, 60, 0.7));
                }
            `}</style>

            <div className="flex items-center gap-3 md:gap-5 px-4 w-full max-w-5xl justify-center">
                {/* נר ימני */}
                <div className="relative w-3 md:w-4 h-6 md:h-8 flex flex-col items-center justify-end">
                    {/* להבה */}
                    <div className="candle-flame absolute -top-1 md:-top-2 w-2.5 md:w-3 h-4 md:h-5 bg-gradient-to-t from-yellow-200 via-orange-500 to-transparent rounded-[50%_50%_20%_20%]"></div>
                    {/* גוף הנר */}
                    <div className="w-2.5 md:w-3 h-3 md:h-4 bg-gradient-to-b from-white to-slate-400 rounded-sm opacity-90"></div>
                </div>

                {/* הטקסט */}
                <span className="text-slate-200 font-medium tracking-widest text-[11px] sm:text-xs md:text-sm 2xl:text-base text-center">
                    {text}
                </span>

                {/* נר שמאלי (לסימטריה) עם דיליי קטן באנימציה כדי שלא ירצדו בדיוק יחד */}
                <div className="relative w-3 md:w-4 h-6 md:h-8 flex flex-col items-center justify-end transform scale-x-[-1]">
                    <div className="candle-flame absolute -top-1 md:-top-2 w-2.5 md:w-3 h-4 md:h-5 bg-gradient-to-t from-yellow-200 via-orange-500 to-transparent rounded-[50%_50%_20%_20%]" style={{ animationDelay: '0.4s' }}></div>
                    <div className="w-2.5 md:w-3 h-3 md:h-4 bg-gradient-to-b from-white to-slate-400 rounded-sm opacity-90"></div>
                </div>
            </div>
        </div>
    );
};

export default MemorialDayBanner;