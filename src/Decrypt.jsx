import DecryptedText from './DecryptedText.jsx';
import { useReducedMotion } from './useMedia.js';

// DecryptedText, but plain text for people who prefer reduced motion
export default function Decrypt({ text, ...rest }) {
  const reduce = useReducedMotion();
  return reduce ? <span>{text}</span> : <DecryptedText text={text} {...rest} />;
}
