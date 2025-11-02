import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

function SlideCard({ slide, direction }) {
  const [expanded, setExpanded] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const svgRef = useRef(null);

  useEffect(() => {
    setIsEntering(true);
    const timer = setTimeout(() => setIsEntering(false), 100);
    return () => clearTimeout(timer);
  }, [slide]);

  const getAnimationClass = () => {
    if (!isEntering) return "translate-x-0 scale-100 opacity-100";
    return direction === "right"
      ? "translate-x-32 scale-90 opacity-0"
      : "-translate-x-32 scale-90 opacity-0";
  };

  // === 💫 Network Graph Rendering ===
  useEffect(() => {
    if (!slide.networkData || !svgRef.current) return;

    const { nodes, links } = slide.networkData;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 500;
    const height = 500;

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#666")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer");

    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "14px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);

    link
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#FFD700").attr("stroke-width", 4);
        tooltip.style("opacity", 1).html(`${d.source.id} ↔️ ${d.target.id}<br/><strong>${d.value} mentions</strong>`);
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#666").attr("stroke-width", 2);
        tooltip.style("opacity", 0);
      });

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", "#8B5CF6")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .style("cursor", "grab")
      .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "#fff")
      .attr("font-size", "14px")
      .attr("font-weight", "600")
      .style("pointer-events", "none")
      .text((d) => d.id);

    simulation.on("tick", () => {
      link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
      d3.select(this).style("cursor", "grabbing");
    }

    function dragged(event, d) {
      d.fx = event.x; d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
      d3.select(this).style("cursor", "grab");
    }

    return () => tooltip.remove();
  }, [slide]);

  // 🆕 Check if this is an AI slide
  const isAISlide = slide.aiData && slide.aiData.type;

  return (
    <div
      className={`bg-black/40 border border-white/20 rounded-2xl p-10 w-[70%] max-w-3xl text-center 
                  backdrop-blur-md shadow-2xl z-20 cursor-pointer transform transition-all duration-700 
                  ease-out hover:scale-[1.03] ${getAnimationClass()}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="max-h-[75vh] overflow-y-auto pr-2 no-scrollbar">
        <h2 className="text-6xl font-extrabold mb-4 animate-bounce-in">
          {slide.title}
        </h2>
        <p className="text-lg mb-2 opacity-80 animate-fade-in-delay-1">
          {slide.subtitle}
        </p>

        <div className="text-2xl my-6 animate-fade-in-delay-2">
          {slide.mainStat && (
            <div className="text-5xl font-bold text-purple-300 mb-2 animate-pop-in">
              {slide.mainStat}
            </div>
          )}
          <p>{slide.summary}</p>
        </div>

        {/* 🆕 AI SLIDE SPECIAL RENDERING */}
        {isAISlide ? (
          <AISlideContent aiData={slide.aiData} expanded={expanded} />
        ) : (
          <>
            {slide.stats && slide.stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6">
                {slide.stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-all duration-300 hover:scale-110 animate-fade-in-up"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="text-3xl font-bold text-blue-300">{stat.value}</div>
                    <div className="text-sm opacity-80">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {slide.networkData && (
              <div className="flex justify-center mt-8">
                <svg ref={svgRef} width="400" height="400" />
              </div>
            )}
          </>
        )}

        {expanded && slide.details && (
          <div className="mt-6 text-lg text-gray-200 border-t border-white/20 pt-4 animate-expand whitespace-pre-line text-left">
            {slide.details}
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes expand {
          0% { max-height: 0; opacity: 0; }
          100% { max-height: 500px; opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-pop-in { animation: pop-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s backwards; }
        .animate-fade-in-delay-1 { animation: fade-in-up 0.5s ease-out 0.2s backwards; }
        .animate-fade-in-delay-2 { animation: fade-in-up 0.5s ease-out 0.3s backwards; }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out backwards; }
        .animate-expand { animation: expand 0.4s ease-out; }
      `}</style>
    </div>
  );
}

// 🆕 AI SLIDE CONTENT RENDERER
function AISlideContent({ aiData, expanded }) {
  const { type, data } = aiData;

  switch (type) {
    case 'personalities':
      return <PersonalitiesContent data={data} expanded={expanded} />;
    case 'alignments':
      return <AlignmentsContent data={data} expanded={expanded} />;
    case 'roles':
      return <RolesContent data={data} expanded={expanded} />;
    case 'topics':
      return <TopicsContent data={data} expanded={expanded} />;
    case 'vocabulary':
      return <VocabularyContent data={data} expanded={expanded} />;
    default:
      return null;
  }
}

function PersonalitiesContent({ data, expanded }) {
  const displayData = expanded ? data : data.slice(0, 4);
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {displayData.map((person, idx) => (
        <div key={idx} className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg p-4 text-left animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
          <div className="font-bold text-xl text-purple-300 mb-2">{person.name}</div>
          <div className="text-sm space-y-1">
            <div><span className="text-blue-300">Style:</span> {person.style}</div>
            <div><span className="text-blue-300">Tone:</span> {person.tone}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {person.traits.map((trait, i) => (
                <span key={i} className="px-2 py-1 bg-white/10 rounded-full text-xs">{trait}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlignmentsContent({ data, expanded }) {
  const alignmentColors = {
    'Lawful Good': 'from-green-500/20 to-blue-500/20',
    'Neutral Good': 'from-blue-500/20 to-cyan-500/20',
    'Chaotic Good': 'from-purple-500/20 to-pink-500/20',
    'Lawful Neutral': 'from-gray-500/20 to-blue-500/20',
    'Chaotic Neutral': 'from-orange-500/20 to-red-500/20',
  };

  const displayData = expanded ? data : data.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {displayData.map((person, idx) => (
        <div key={idx} className={`bg-gradient-to-br ${alignmentColors[person.alignment] || 'from-gray-500/20 to-gray-600/20'} rounded-lg p-4 text-left animate-fade-in-up`} style={{ animationDelay: `${idx * 100}ms` }}>
          <div className="font-bold text-xl text-purple-300 mb-1">{person.name}</div>
          <div className="text-sm font-semibold text-blue-300 mb-2">{person.alignment}</div>
          <div className="text-xs opacity-80 italic">"{person.reason}"</div>
        </div>
      ))}
    </div>
  );
}

function RolesContent({ data, expanded }) {
  const roleEmojis = {
    therapist: '🧘', hype_man: '🎉', comedian: '🤡',
    drama_queen: '👑', meme_lord: '😂', ghost: '👻',
    voice_of_reason: '🧠', chaos_agent: '🌪️'
  };

  const rolesArray = Object.entries(data).map(([role, info]) => ({ role, ...info }));
  const displayData = expanded ? rolesArray : rolesArray.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {displayData.map((roleData, idx) => (
        <div key={idx} className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg p-4 text-left animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{roleEmojis[roleData.role] || '🎭'}</span>
            <div>
              <div className="font-bold text-lg text-purple-300 capitalize">{roleData.role.replace(/_/g, ' ')}</div>
              <div className="text-xs opacity-60">{roleData.score}/100</div>
            </div>
          </div>
          <div className="font-bold text-md">{roleData.name}</div>
          <div className="text-xs opacity-80 italic mt-1">"{roleData.reason}"</div>
        </div>
      ))}
    </div>
  );
}

function TopicsContent({ data, expanded }) {
  const vibeEmojis = { stressful: '😰', excited: '🎉', informative: '📚', funny: '😂', serious: '🤔' };
  const displayData = expanded ? data : data.slice(0, 4);

  return (
    <div className="space-y-3 mt-6">
      {displayData.map((topic, idx) => (
        <div key={idx} className="bg-white/10 rounded-lg p-4 text-left hover:bg-white/15 transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{vibeEmojis[topic.vibe] || '💭'}</span>
            <div className="font-bold text-lg text-purple-300">{topic.topic}</div>
            <span className="ml-auto text-sm bg-white/10 px-2 py-1 rounded-full">{topic.message_count} msgs</span>
          </div>
          <div className="text-sm opacity-80 italic">{topic.description}</div>
        </div>
      ))}
    </div>
  );
}

function VocabularyContent({ data, expanded }) {
  const displayData = expanded ? data : data.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {displayData.map((word, idx) => (
        <div key={idx} className="bg-white/10 rounded-lg p-4 text-left hover:bg-white/15 transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
          <div className="flex items-baseline justify-between mb-2">
            <div className="font-bold text-2xl text-purple-300">{word.word}</div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full capitalize">{word.frequency}</span>
          </div>
          <div className="text-sm mb-1"><span className="text-blue-300">Means:</span> {word.meaning}</div>
          <div className="text-xs opacity-70 italic">"{word.example}"</div>
        </div>
      ))}
    </div>
  );
}

export default SlideCard;