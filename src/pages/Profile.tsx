<TabsContent value="favorites">
  {loading ? (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ) : favorites.length === 0 ? (
    <div className="py-16 text-center px-8">
      <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-2xl font-bold mb-2">No favorites yet</h3>
      <p className="text-muted-foreground mb-6">
        Tap the heart on any gist to save it here
      </p>
      <Button onClick={() => navigate("/feed")}>Explore Feed</Button>
    </div>
  ) : (
    <div className="divide-y divide-border">
      {favorites.map((gist) => (
        <article
          key={gist.id}
          className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <div className="flex gap-3">
            {/* Fluxa Icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
              F
            </div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold truncate hover:underline">
                    Fluxa
                  </span>
                  <span className="text-muted-foreground truncate">@fluxa</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-sm">
                    {new Date(gist.published_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="mb-3">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {gist.topic_category}
                </span>

                <h3 className="font-bold text-base mt-2">{gist.headline}</h3>

                <p className="text-sm text-muted-foreground mt-1">
                  {gist.topic}
                </p>
              </div>

              {/* Image */}
              {gist.image_url && (
                <div className="rounded-2xl overflow-hidden border border-border mb-3">
                  <img
                    src={gist.image_url}
                    alt={gist.topic}
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-start max-w-md mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-primary hover:bg-primary/10"
                  onClick={() => handleUnfavorite(gist.id)}
                >
                  <Heart className="w-4 h-4 mr-2 fill-primary" />
                  Liked
                </Button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )}
</TabsContent>
