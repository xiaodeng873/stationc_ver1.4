import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  container?: HTMLElement;
}

export function Portal({ children, container }: PortalProps) {
  const defaultContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container && !defaultContainer.current) {
      const div = document.createElement('div');
      div.setAttribute('data-portal-container', 'true');
      document.body.appendChild(div);
      defaultContainer.current = div;
    }

    return () => {
      if (defaultContainer.current) {
        document.body.removeChild(defaultContainer.current);
        defaultContainer.current = null;
      }
    };
  }, [container]);

  const targetContainer = container || defaultContainer.current;

  if (!targetContainer) {
    return null;
  }

  return createPortal(children, targetContainer);
}
