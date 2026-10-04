import DecryptedText from './DecryptedText.jsx';
import { useMedia } from './useMedia.js';

// DecryptedText, but plain text for people who prefer reduced motion
export default function Decrypt({ text, ...rest }) {
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  return reduce ? <span>{text}</span> : <DecryptedText text={text} {...rest} />;
}
