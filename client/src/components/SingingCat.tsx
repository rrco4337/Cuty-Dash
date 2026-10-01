export default function SingingCat({ isPlaying }: { isPlaying: boolean }) {
  return (
    <img
      className={isPlaying ? 'singing-cat singing-cat--hop' : 'singing-cat'}
      src="/sprites/cat-sing.png"
      alt=""
    />
  );
}
