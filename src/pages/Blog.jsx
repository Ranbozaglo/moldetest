import React from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { BLOG_POSTS } from "@/data/blogPosts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Blog() {
  usePageMeta({
    title: "Mold Testing Blog | Total Testing",
    description: "Practical guides on indoor mold signs, surface swab testing, and when to use a DIY lab test.",
    canonicalPath: "/blog",
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Mold testing blog</h1>
      <p className="mt-3 text-slate-600">
        Practical guides for homeowners who want lab facts before they guess.
      </p>
      <div className="mt-8 space-y-4">
        {BLOG_POSTS.map((post) => (
          <Link key={post.slug} to={`/${post.slug}`} className="block">
            <Card className="hover:border-blue-300 hover:shadow-md transition-all">
              <CardHeader>
                <p className="text-xs text-blue-700 font-medium">
                  {(() => {
                    const [year, month, day] = post.date.split("-").map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    });
                  })()}
                </p>
                <CardTitle className="text-xl leading-snug">{post.title}</CardTitle>
                <CardDescription className="text-base">{post.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-blue-700">Read the guide →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
