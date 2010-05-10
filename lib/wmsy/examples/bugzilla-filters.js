
fm.defineFilterGroup({
  name: "How it affects me",
  filters: [
    {
      name: "Approved patch",
    },
    {
      name: "Dissed patch",
    },
    {
      name: "Feedback required",
    },
    {
      name: "Assignee",
    },
    {
      name: "Reporter",
    },
    {
      name: "CC",
    },
  ],
});

fm.defineFilterGroup({
  name: "Patches",
  filters: [
    {
      name: "Reviewed",
    },
    {
      name: "Review needed",
    },
    {
      name: "All obsolete",
    },
    {
      name: "Never had one",
    }
  ]
});

fm.defineFilterTimeline({
  name: "Assignee Activity",
});

fm.defineFilterHistogram({
  name: "Review Request Age",
});

fm.defineAutoFacet({
  name: "Status",
});

fm.defineAutoFacet({
  name: "Assignee",
});

fm.defineAutoFacetHierarchy({
  name: "Product / Comp",
  attributes: ["product", "component"],
});
