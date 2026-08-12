// React hook to get if the component is currently visible
import {useEffect, useState} from "react";

export const useIsVisible = (ref, unloadDelay=0) => {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if(!ref) { return; }

    let timeout;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timeout);

      entry.isIntersecting ?
        setIntersecting(true) :
        timeout = setTimeout(() => setIntersecting(false), unloadDelay);
    });

    observer.observe(ref);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isIntersecting;
};
