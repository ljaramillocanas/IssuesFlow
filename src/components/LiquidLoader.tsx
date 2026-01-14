'use client';

import React from 'react';
import { motion } from 'framer-motion';

const LiquidLoader = () => {
    const [bubbles, setBubbles] = React.useState<any[]>([]);

    React.useEffect(() => {
        setBubbles([...Array(5)].map((_, i) => ({
            id: i,
            width: Math.random() * 8 + 4,
            height: Math.random() * 8 + 4,
            left: `${Math.random() * 80 + 10}%`,
            duration: Math.random() * 1 + 1,
            delay: Math.random() * 2,
        })));
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="relative w-32 h-40">
                {/* Container (Glass) */}
                <div
                    className="absolute inset-0 z-20 border-4 border-white/20 rounded-xl overflow-hidden backdrop-blur-sm"
                    style={{
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                        background: 'linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.01))'
                    }}
                >
                    {/* Liquid */}
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 bg-blue-500"
                        style={{
                            background: 'linear-gradient(to top, #3b82f6, #60a5fa)',
                            boxShadow: '0 0 30px #3b82f6'
                        }}
                        initial={{ height: '0%' }}
                        animate={{
                            height: ['0%', '100%', '0%']
                        }}
                        transition={{
                            duration: 3,
                            ease: "easeInOut",
                            repeat: Infinity,
                            repeatDelay: 0.5
                        }}
                    >
                        {/* Wave Surface */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-400 opacity-50 blur-sm transform -translate-y-1/2" />

                        {/* Bubbles */}
                        {bubbles.map((bubble) => (
                            <motion.div
                                key={bubble.id}
                                className="absolute bg-white/30 rounded-full"
                                style={{
                                    width: bubble.width,
                                    height: bubble.height,
                                    left: bubble.left,
                                }}
                                animate={{
                                    y: [0, -150],
                                    opacity: [0, 1, 0]
                                }}
                                transition={{
                                    duration: bubble.duration,
                                    repeat: Infinity,
                                    delay: bubble.delay,
                                    ease: "easeOut"
                                }}
                            />
                        ))}
                    </motion.div>
                </div>

                {/* Reflection/Shine on Glass */}
                <div className="absolute inset-0 z-30 rounded-xl pointer-events-none"
                    style={{
                        background: 'linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 50%)'
                    }}
                />
            </div>

            <motion.p
                className="mt-6 text-lg font-medium text-blue-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                Cargando recursos...
            </motion.p>
        </div>
    );
};

export default LiquidLoader;
