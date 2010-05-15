
fm.defineFilterGroup({
  name: "How it affects me",
  filters: [
    {
      name: "Approved patch",
      filter: function filter_approved_patch(query, context) {
        query.chew({
          activePatches: query.hasOne({
            attacher: context.me,
            flags: query.hasAll(
              query.or({
                  isFeedbackFlag: false
                }, {
                  isFeedbackFlag: true,
                  status: "+",
                }
              )
            ),
          }),
        });
        return query;
      }
    },
    {
      name: "Dissed patch",
      filter: function filter_dissed_patch(query, context) {
        query.chew({
          activePatches: query.hasOne({
            attacher: context.me,
            flags: query.hasAny({
              isFeedbackFlag: true,
              status: "-",
            }),
          }),
        });
        return query;
      }
    },
    {
      name: "Feedback required",
      filter: function filter_feedback_required(query, context) {
        query.chew({
          activePatches: query.hasOne({
            flags: query.hasAny({
              feedbackActionRequired: true,
              requestee: context.me
            }),
          }),
        });
        return query;
      }
    },
    {
      name: "Assignee",
      filter: function filter_assignee(query, context) {
        query.chew({
          assignee: context.me,
        });
        return query;
      }
    },
    {
      name: "Reporter",
      filter: function filter_reporter(query, context) {
        query.chew({
          reporter: context.me,
        });
        return query;
      }
    },
    {
      name: "CC",
      filter: function filter_cc(query, context) {
        query.chew({
          cc: context.me,
        });
        return query;
      }
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
