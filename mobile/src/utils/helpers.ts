export const formatTime = (
  seconds: number,
) => {
  const minutes = Math.floor(seconds / 60);

  return `${minutes} min`;
};