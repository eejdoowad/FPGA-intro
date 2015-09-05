library verilog;
use verilog.vl_types.all;
entity example is
    generic(
        LEDR_SIZE       : integer := 10
    );
    port(
        SW              : in     vl_logic_vector;
        LEDR            : out    vl_logic_vector
    );
    attribute mti_svvh_generic_type : integer;
    attribute mti_svvh_generic_type of LEDR_SIZE : constant is 1;
end example;
