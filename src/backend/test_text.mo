import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Array "mo:core/Array";

actor {  
  public query func test(s: Text, q: Text) : async Bool {
    let lower = Text.toLowercase(s);
    let parts = Text.split(lower, #predicate(func(c : Char) : Bool {
      c == ' '
    }));
    let arr = Array.filter(Iter.toArray(parts), func(t : Text) : Bool { t.size() > 1 });
    let trimmed = Text.trim(q, #char(' '));
    ignore trimmed;
    ignore arr;
    let sLower = Text.toLowercase(s);
    let qLower = Text.toLowercase(q);
    sLower.contains(#text qLower)
  };
};
