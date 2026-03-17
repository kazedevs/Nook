"use client";

export function DemoVideo() {
  return (
    <section className="py-20 px-6 bg-black border-t border-n-border border-b-n-border">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.02em] leading-[1.2] mb-4 font-inter text-n-text">
          See Nook in Action
        </h2>

        <p className="text-lg text-n-muted leading-[1.6] max-w-2xl mx-auto mb-12 font-light font-[system-ui]">
          Watch how Nook scans your Mac and helps you reclaim valuable disk
          space in seconds. No complex setup, no waiting - just instant results.
        </p>

        {/* Key stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-n-green-text mb-2 font-inter">
              2.3GB
            </div>
            <div className="text-sm text-n-muted font-[system-ui] font-light">
              Average space recovered per scan
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-n-green-text mb-2 font-inter">
              15 sec
            </div>
            <div className="text-sm text-n-muted font-[system-ui] font-light">
              Average scan time
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-n-green-text mb-2 font-inter">
              99.9%
            </div>
            <div className="text-sm text-n-muted font-[system-ui] font-light">
              Accuracy rate
            </div>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-n-border2 bg-n-card2">
          {/* Autoplay video */}
          <div className="relative aspect-video bg-gradient-to-br from-n-card to-n-card2 flex items-center justify-center">
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/demo-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        <p className="text-sm text-n-dim mt-6 font-[system-ui] font-light">
          Watch how Nook identifies and removes junk files in real-time
        </p>
      </div>
    </section>
  );
}
