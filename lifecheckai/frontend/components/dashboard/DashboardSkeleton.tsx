import { Wind, Thermometer, Flower2, Sun } from "lucide-react";
import { SkeletonBase } from "../ui/SkeletonBase";
import { Card } from "../ui/Card";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Search Header Skeleton */}
      <div className="sticky top-16 z-30 bg-bg-secondary/90 border-b border-border-default px-4 sm:px-8 lg:px-16 py-3">
        <div className="max-w-7xl mx-auto flex gap-4">
          <SkeletonBase className="h-12 flex-1" />
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6 w-full">
        
        {/* Profile Selector Skeleton */}
        <SkeletonBase className="h-20 w-full" />
        
        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Score Skeleton */}
          <Card className="flex flex-col items-center justify-center border-l-4 border-l-border-default animate-pulse min-h-[300px]">
            <div className="h-6 w-48 bg-white/10 rounded-full mb-8" />
            <div className="w-44 h-44 rounded-full border-8 border-white/5 bg-white/5" />
            <div className="h-8 w-32 bg-white/10 rounded-full mt-8" />
          </Card>

          {/* Metrics Skeletons */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[Wind, Thermometer, Flower2, Sun].map((Icon, i) => (
              <Card key={i} className="animate-pulse flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon size={20} className="text-white/20" />
                  </div>
                  <div className="w-16 h-6 rounded-full bg-white/10" />
                </div>
                <div>
                  <div className="w-24 h-4 bg-white/10 rounded mb-3" />
                  <div className="w-16 h-10 bg-white/20 rounded" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Radar Skeleton */}
        <Card className="h-64 animate-pulse flex flex-col mt-2">
           <div className="w-48 h-6 bg-white/10 rounded mb-8" />
           <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
             <SkeletonBase className="h-full border-none" />
             <SkeletonBase className="hidden md:block h-full border-none" />
             <SkeletonBase className="hidden md:block h-full border-none" />
           </div>
        </Card>

      </div>
    </div>
  );
}
