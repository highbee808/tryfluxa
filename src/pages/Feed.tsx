<NewsCard
  key={`news-${item.data.id}`}
  id={item.data.id}
  title={item.data.title}
  source={item.data.source}
  time={item.data.time}
  description={item.data.description}
  url={item.data.url}
  imageUrl={item.data.image}
  category={item.data.category}
  entityName={item.data.entityName}
  isPlaying={currentPlayingNewsId === item.data.id && isNewsPlaying}
  isLiked={likedGists.includes(item.data.id)}
  isBookmarked={bookmarkedGists.includes(item.data.id)}
  onPlay={async (audioUrl?: string) => {
    if (currentPlayingNewsId === item.data.id && isNewsPlaying) {
      newsAudioRef.current?.pause();
      setIsNewsPlaying(false);
      setCurrentPlayingNewsId(null);
    } else {
      if (newsAudioRef.current) newsAudioRef.current.pause();

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        newsAudioRef.current = audio;
        audio.play();
        setIsNewsPlaying(true);
        setCurrentPlayingNewsId(item.data.id);
        audio.onended = () => {
          setIsNewsPlaying(false);
          setCurrentPlayingNewsId(null);
        };
      } else {
        toast.error("Audio not available");
      }
    }
  }}
  onLike={() => handleLike(item.data.id)}
  onComment={() => handleNewsChat(item.data)}  // ✅ Keep this version
  onBookmark={() => handleBookmark(item.data.id)}
  onShare={() => {
    if (item.data.url) {
      navigator.clipboard.writeText(item.data.url);
      toast.success("Link copied!");
    }
  }}
/>
