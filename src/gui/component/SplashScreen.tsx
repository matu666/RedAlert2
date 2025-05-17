import React, { useEffect, useRef, useState, MutableRefObject } from 'react';

interface SplashScreenProps {
  width: number;
  height: number;
  parentElement: HTMLElement | null; // Changed to allow null for initial render
  backgroundImage?: string;
  loadingText?: string;
  copyrightText?: string;
  disclaimerText?: string;
  onRender?: () => void; // Callback when component is rendered
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  width,
  height,
  parentElement,
  backgroundImage,
  loadingText,
  copyrightText,
  disclaimerText,
  onRender,
}) => {
  const [rendered, setRendered] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const loadingElRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const copyrightElRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;
  const disclaimerElRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;

  // Initial render and append to parent
  useEffect(() => {
    if (parentElement && !rendered) {
      const div = document.createElement('div');
      elRef.current = div; // Assign to ref

      // Apply initial styles and structure (similar to original render method)
      div.style.backgroundColor = 'black';
      div.style.color = 'white';
      div.style.padding = '10px';
      div.style.boxSizing = 'border-box';
      div.style.backgroundRepeat = 'no-repeat';
      div.style.backgroundPosition = '50% 50%';
      div.style.textShadow = '1px 1px black';
      div.style.position = 'relative'; // For absolute positioning of children

      const loadingDiv = document.createElement('div');
      loadingElRef.current = loadingDiv;
      div.appendChild(loadingDiv);

      const copyrightDiv = document.createElement('div');
      copyrightDiv.style.position = 'absolute';
      copyrightDiv.style.bottom = '10px';
      copyrightDiv.style.right = '10px';
      copyrightDiv.style.textAlign = 'right';
      copyrightElRef.current = copyrightDiv;
      div.appendChild(copyrightDiv);

      const disclaimerDiv = document.createElement('div');
      disclaimerDiv.style.position = 'absolute';
      disclaimerDiv.style.bottom = '10px';
      disclaimerDiv.style.left = '10px';
      disclaimerElRef.current = disclaimerDiv;
      div.appendChild(disclaimerDiv);
      
      parentElement.appendChild(div);
      setRendered(true);
      if (onRender) {
        onRender();
      }
    }
  }, [parentElement, rendered, onRender]);

  // Update size
  useEffect(() => {
    if (elRef.current) {
      elRef.current.style.width = `${width}px`;
      elRef.current.style.height = `${height}px`;
    }
  }, [width, height]);

  // Update background image
  useEffect(() => {
    if (elRef.current && backgroundImage) {
      elRef.current.style.backgroundImage = `url(${backgroundImage})`;
    }
  }, [backgroundImage]);

  // Update loading text
  useEffect(() => {
    if (loadingElRef.current && loadingText !== undefined) {
      loadingElRef.current.innerHTML = loadingText;
    }
  }, [loadingText]);

  // Update copyright text
  useEffect(() => {
    if (copyrightElRef.current && copyrightText !== undefined) {
      copyrightElRef.current.innerHTML = copyrightText.replace(/\n/g, '<br />');
    }
  }, [copyrightText]);

  // Update disclaimer text
  useEffect(() => {
    if (disclaimerElRef.current && disclaimerText !== undefined) {
      disclaimerElRef.current.innerHTML = disclaimerText.replace(/\n/g, '<br />');
    }
  }, [disclaimerText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elRef.current && elRef.current.parentElement) {
        elRef.current.parentElement.removeChild(elRef.current);
      }
      setRendered(false); // Reset rendered state
    };
  }, []);


  // This component manages its DOM insertion and removal directly,
  // so it doesn't return any JSX to be rendered by React's virtual DOM here.
  return null; 
};

export default SplashScreen; 