import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'inter': ['Inter', 'system-ui', 'sans-serif'],
				'playfair': ['Playfair Display', 'Georgia', 'serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					glow: 'hsl(var(--accent-glow))'
				},
				popover: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					border: 'hsl(var(--card-border))'
				},
				'glass': {
					'subtle': 'var(--glass-subtle)',
					'medium': 'var(--glass-medium)',
					'strong': 'var(--glass-strong)'
				}
			},
			backgroundImage: {
				'gradient-primary': 'linear-gradient(135deg, hsl(var(--primary-gradient-1)), hsl(var(--primary-gradient-2)), hsl(var(--primary-gradient-3)))',
				'gradient-accent': 'linear-gradient(90deg, hsl(var(--accent-gradient-1)), hsl(var(--accent-gradient-2)))',
				'gradient-elegant': 'radial-gradient(ellipse at top, hsl(var(--primary-gradient-1) / 0.3), hsl(var(--primary-gradient-2) / 0.2), transparent 70%)',
				'gradient-mesh': 'conic-gradient(from 0deg at 50% 50%, hsl(var(--primary-gradient-1) / 0.1), hsl(var(--primary-gradient-2) / 0.2), hsl(var(--primary-gradient-3) / 0.1), hsl(var(--accent-gradient-1) / 0.2))'
			},
			boxShadow: {
				'elegant-sm': 'var(--shadow-sm)',
				'elegant-md': 'var(--shadow-md)', 
				'elegant-lg': 'var(--shadow-lg)',
				'glow': 'var(--shadow-glow)',
				'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
			},
			backdropBlur: {
				'glass': '16px',
				'elegant': '24px'
			},
			borderRadius: {
				'lg': 'var(--radius-lg)',
				'md': 'var(--radius)',
				'sm': 'calc(var(--radius) - 4px)',
				'xl': 'var(--radius-xl)',
				'elegant': '1.25rem'
			},
			transitionTimingFunction: {
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
				'elegant': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'float-elegant': {
					'0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
					'50%': { transform: 'translateY(-10px) rotate(1deg)' }
				},
				'glow-pulse': {
					'0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
					'50%': { opacity: '1', transform: 'scale(1.05)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'fade-in-elegant': {
					'0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
					'100%': { opacity: '1', transform: 'translateY(0px) scale(1)' }
				},
				'slide-up-elegant': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0%)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float-elegant': 'float-elegant 6s ease-in-out infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'shimmer': 'shimmer 2s linear infinite',
				'fade-in-elegant': 'fade-in-elegant 0.6s ease-out',
				'slide-up-elegant': 'slide-up-elegant 0.8s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
