library verilog;
use verilog.vl_types.all;
entity my_xor is
    port(
        a               : in     vl_logic;
        b               : in     vl_logic;
        \out\           : out    vl_logic
    );
end my_xor;
