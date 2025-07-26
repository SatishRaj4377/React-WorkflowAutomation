import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeContext as ThemeContextType } from '../types';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Get initial theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  // Function to update EJ2 CSS theme
  const updateEJ2Theme = (currentTheme: 'light' | 'dark') => {
    const cssLink = document.getElementById('css-link') as HTMLLinkElement;
    if (cssLink) {
      const baseUrl = 'https://cdn.syncfusion.com/ej2/30.1.37/';
      const themeUrl = currentTheme === 'dark' 
        ? `${baseUrl}tailwind-dark.css`
        : `${baseUrl}tailwind.css`;
      
      cssLink.href = themeUrl;
    }
  };

  useEffect(() => {
    // Apply theme to the document element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update EJ2 CSS theme
    updateEJ2Theme(theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Only update if user hasn't explicitly set a preference
      if (!localStorage.getItem('theme')) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Safari < 14
    else if ('addListener' in mediaQuery) {
      // @ts-ignore
      mediaQuery.addListener(handleChange);
      // @ts-ignore
      return () => mediaQuery.removeListener(handleChange);
    }
    
    return undefined;
  }, []);

  // Initialize EJ2 theme on component mount
  useEffect(() => {
    updateEJ2Theme(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;